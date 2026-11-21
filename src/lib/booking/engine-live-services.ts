import "server-only";
import type { Provider, Service } from "@/lib/providers";
import { branchBookability, weeklyHoursRows, type BranchHours, type WeeklyHoursRow } from "./engine-availability";
import { cheapestPrice, readBookableService } from "./engine-price";
import { servicesOfferedAtAnyBranch, type ServiceLink } from "./engine-service-scope";

/**
 * Live services + prices for an engine-connected provider, fetched server-side at request time
 * (never cached) so a price change in book-spa shows up on refresh despite the provider page's
 * own `revalidate = 300` ISR. `cache: "no-store"` on this one fetch makes Next render this
 * specific page dynamically per-request — other (unconnected) provider pages never execute this
 * code path, so they keep their normal ISR behavior untouched.
 *
 * Fails soft, always: short timeout + try/catch + defensive shape-checking. Returns null on any
 * failure, which the caller treats as "keep the seeded services" — a demo page must never error
 * or go blank because book-spa hiccuped.
 */
const TIMEOUT_MS = 2500;

type BranchRow = {
  id: string;
  name: string;
  open_time: string | null;
  close_time: string | null;
  excluded_service_categories: string[] | null;
};

/** One anon GET against PostgREST, failing soft to null. Same reads the drawer itself makes. */
async function restGet<T>(base: string, key: string, path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${base}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * What the studio page needs to agree with the drawer: per-branch hours, which branches can take
 * online bookings at all, and which services each branch offers. Reads exactly what the drawer
 * reads (branches, branch_working_hours, rooms, branch_service_links). Any failed read returns
 * null for that part, and the caller then hides it rather than guess.
 */
async function fetchBranchScope(base: string, key: string, orgSlug: string) {
  const orgs = await restGet<{ id: string; industries: { enable_rooms: boolean | null } | { enable_rooms: boolean | null }[] | null }[]>(
    base,
    key,
    `organizations?slug=eq.${encodeURIComponent(orgSlug)}&is_active=eq.true&select=id,industries(enable_rooms)&limit=1`
  );
  const org = orgs?.[0];
  if (!org) return null;
  const industry = Array.isArray(org.industries) ? org.industries[0] : org.industries;
  const enableRooms = industry?.enable_rooms !== false;

  const branches = await restGet<BranchRow[]>(
    base,
    key,
    `branches?org_id=eq.${org.id}&is_active=eq.true&select=id,name,open_time,close_time,excluded_service_categories&order=name`
  );
  if (!branches || branches.length === 0) return null;

  const ids = branches.map((b) => b.id).join(",");
  const [hourRows, roomRows] = await Promise.all([
    restGet<(WeeklyHoursRow & { branch_id: string })[]>(
      base,
      key,
      `branch_working_hours?branch_id=in.(${ids})&select=branch_id,day_of_week,start_time,end_time,is_day_off`
    ),
    restGet<{ branch_id: string }[]>(base, key, `rooms?branch_id=in.(${ids})&is_active=eq.true&select=branch_id`),
  ]);

  const perBranch = branches.map((b) => {
    const hours: BranchHours | null = hourRows
      ? {
          weekly: hourRows.filter((r) => r.branch_id === b.id),
          openTime: b.open_time,
          closeTime: b.close_time,
        }
      : null;
    const roomCount = roomRows ? roomRows.filter((r) => r.branch_id === b.id).length : null;
    return { branch: b, hours, bookable: branchBookability({ hours, roomCount, enableRooms }).bookable };
  });
  return perBranch;
}

export async function fetchLiveServices(
  orgSlug: string,
  options: { scopeToBranches?: boolean } = {}
): Promise<{
  services: Service[];
  serviceCategories: string[];
  fromPrice: number;
  branchHours: NonNullable<Provider["branchHours"]> | null;
} | null> {
  const base = process.env.NEXT_PUBLIC_BOOK_SPA_ENGINE_URL;
  const key = process.env.NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY;
  if (!base || !key) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${base}/rest/v1/rpc/public_get_bookable_services`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_org_slug: orgSlug }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const allServices: Service[] = data.map((row) => {
      const r = readBookableService(row as Record<string, unknown>);
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        durations: [r.durationMinutes],
        price: r.price,
        description: r.description ?? "",
      };
    });

    // Narrow to what the drawer would actually offer: services bookable at AT LEAST ONE branch
    // that can take online bookings (same narrowing rule as the drawer, shared module). The page
    // has no chosen branch, so it shows the union; the drawer narrows further once one is picked.
    // If anything about branches can't be read, keep the org-wide list (never a blank page) and
    // hide the hours block instead of guessing.
    // Only when the real-booking drawer is on; with the flag off the page behaves as it always did.
    const scope = options.scopeToBranches ? await fetchBranchScope(base, key, orgSlug) : null;
    let services = allServices;
    let branchHours: NonNullable<Provider["branchHours"]> | null = null;
    if (scope) {
      const pool = scope.some((b) => b.bookable) ? scope.filter((b) => b.bookable) : scope;
      const ids = allServices.map((s) => s.id).join(",");
      const links = await restGet<ServiceLink[]>(base, key, `branch_service_links?service_id=in.(${ids})&select=service_id,branch_id`);
      const narrowed = servicesOfferedAtAnyBranch(
        allServices,
        pool.map((b) => ({ id: b.branch.id, excludedCategories: b.branch.excluded_service_categories ?? [] })),
        links
      );
      if (narrowed.length > 0) services = narrowed;
      if (scope.every((b) => b.hours)) {
        branchHours = scope.map((b) => ({ branch: b.branch.name, hours: weeklyHoursRows(b.hours as BranchHours) }));
      }
    }

    const serviceCategories = Array.from(new Set(services.map((s) => s.category)));
    // The same single charged price the drawer shows (engine-price.ts), never a tier range.
    const fromPrice = cheapestPrice(services.map((s) => s.price));

    return { services, serviceCategories, fromPrice, branchHours };
  } catch {
    return null;
  }
}
