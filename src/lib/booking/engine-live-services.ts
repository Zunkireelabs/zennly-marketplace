import "server-only";
import type { Service } from "@/lib/providers";

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

export async function fetchLiveServices(
  orgSlug: string
): Promise<{ services: Service[]; serviceCategories: string[]; fromPrice: number } | null> {
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

    const services: Service[] = data.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        name: String(r.name ?? "Service"),
        category: String(r.category_name ?? "Other"),
        durations: [Number(r.duration_minutes) || 60],
        price: Number(r.effective_price_npr ?? r.price_npr) || 0,
        description: typeof r.description === "string" ? r.description : "",
      };
    });

    const serviceCategories = Array.from(new Set(services.map((s) => s.category)));
    const fromPrice = Math.min(...services.map((s) => s.price).filter((p) => p > 0));

    return { services, serviceCategories, fromPrice: Number.isFinite(fromPrice) ? fromPrice : 0 };
  } catch {
    return null;
  }
}
