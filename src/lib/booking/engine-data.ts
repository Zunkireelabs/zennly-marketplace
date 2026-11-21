"use client";

import type { BranchHours, WeeklyHoursRow } from "./engine-availability";
import { getEngineClient } from "./engine-client";
import { readBookableService } from "./engine-price";
import { narrowServicesToBranch, type ServiceLink } from "./engine-service-scope";

/**
 * Read-only fetchers against book-spa's project, mirroring its own src/services/api.js
 * functions of the same shape (fetchOrganizationBySlug, fetchBranchesByOrgId, fetchRooms,
 * fetchClosedDateRanges, fetchBranchAvailabilityWindow, fetchTherapistAvailabilityWindow,
 * fetchServiceEligibleGenderHeadcount, fetchBookableServicesByOrgSlug, fetchBookableTherapists).
 * Same project, same RLS, same anon-readable tables its own unauthenticated booking flow
 * already depends on — these aren't new grants, just the same reads from a second client.
 */

export type EngineOrg = {
  id: string;
  name: string;
  currency: string;
  settings: Record<string, unknown> | null;
  enableRooms: boolean;
  enableStaffGender: boolean;
  showStaffSelection: boolean;
  staffLabel: string;
};

export type EngineBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  openTime: string | null;
  closeTime: string | null;
  onlineBookingCapacity: number | null;
  advanceBookingDays: number | null;
};

export type EngineService = {
  id: string;
  name: string;
  durationMinutes: number;
  /** What book-spa charges with no staff chosen (effective_price_npr). See engine-price.ts. */
  priceNpr: number;
  description: string | null;
  category: string;
  isCombo: boolean;
};

export type EngineTherapist = {
  id: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
};

export type EngineRoom = { id: string; capacity: number };

export type EngineBooking = {
  booking_date: string;
  start_time: string;
  duration_minutes: number;
  room_id: string | null;
  therapist_gender: string | null;
  gender_preference: string | null;
  counts_as_online_capacity: boolean;
};

export type EngineTherapistBusyRow = {
  therapist_id: string | null;
  busy_date: string;
  start_time: string;
  duration_minutes: number;
};

export type ClosedRange = { startDate: string; endDate: string };

/** Mirrors fetchOrganizationBySlug's industries join (TenantContext.jsx's derivation of these flags). */
export async function fetchEngineOrg(orgSlug: string): Promise<EngineOrg | null> {
  const client = getEngineClient();
  if (!client) return null;
  const { data, error } = await client
    .from("organizations")
    .select(
      "id, name, currency, settings, industries ( enable_rooms, enable_staff_gender, staff_label )"
    )
    .eq("slug", orgSlug)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  const industry = Array.isArray(data.industries) ? data.industries[0] : data.industries;
  const settings = (data.settings ?? null) as Record<string, unknown> | null;
  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    settings,
    enableRooms: industry?.enable_rooms !== false,
    enableStaffGender: industry?.enable_staff_gender !== false,
    showStaffSelection: settings?.show_staff_selection === true,
    staffLabel: industry?.staff_label || "Therapist",
  };
}

export async function fetchEngineBranches(orgId: string): Promise<EngineBranch[]> {
  const client = getEngineClient();
  if (!client) return [];
  const { data, error } = await client
    .from("branches")
    .select(
      "id, name, address, phone, is_active, open_time, close_time, online_booking_capacity, advance_booking_days"
    )
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("name");
  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phone: b.phone,
    isActive: b.is_active,
    openTime: b.open_time,
    closeTime: b.close_time,
    onlineBookingCapacity: b.online_booking_capacity,
    advanceBookingDays: b.advance_booking_days,
  }));
}

export function toEngineService(row: Record<string, unknown>): EngineService {
  const r = readBookableService(row);
  return {
    id: r.id,
    name: String(row.name),
    durationMinutes: r.durationMinutes,
    priceNpr: r.price,
    description: r.description,
    category: r.category,
    isCombo: r.isCombo,
  };
}

export async function fetchEngineServices(orgSlug: string): Promise<EngineService[]> {
  const client = getEngineClient();
  if (!client) return [];
  const { data, error } = await client.rpc("public_get_bookable_services", { p_org_slug: orgSlug });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(toEngineService);
}

/**
 * Branch-scoped services — faithful port of fetchBookableServicesByOrgSlug(orgSlug, branchId)'s
 * narrowing (api.js): the org-wide list minus the branch's excluded_service_categories, minus
 * any service that's restricted to OTHER branches via branch_service_links. A service with no
 * rows in branch_service_links at all is unrestricted everywhere; one with rows is only
 * offered at the branches it's explicitly linked to. Getting this wrong offers a service a
 * branch doesn't actually do.
 */
export async function fetchEngineBranchServices(orgSlug: string, branchId: string): Promise<EngineService[]> {
  const client = getEngineClient();
  if (!client) return [];

  const [all, branchRes] = await Promise.all([
    fetchEngineServices(orgSlug),
    client.from("branches").select("excluded_service_categories").eq("id", branchId).single(),
  ]);
  if (all.length === 0) return [];

  const excluded: string[] = branchRes.data?.excluded_service_categories ?? [];
  const afterCategories = narrowServicesToBranch(all, excluded, null, branchId);
  if (afterCategories.length === 0) return [];

  const { data: links, error } = await client
    .from("branch_service_links")
    .select("service_id, branch_id")
    .in(
      "service_id",
      afterCategories.map((s) => s.id)
    );
  if (error || !links || links.length === 0) return afterCategories;
  return narrowServicesToBranch(afterCategories, [], links as ServiceLink[], branchId);
}

export async function fetchEngineTherapists(
  orgSlug: string,
  branchId: string,
  serviceIds: string[]
): Promise<EngineTherapist[]> {
  const client = getEngineClient();
  if (!client) return [];
  const { data, error } = await client.rpc("public_get_bookable_therapists", {
    p_org_slug: orgSlug,
    p_branch_id: branchId,
    p_service_ids: serviceIds.length > 0 ? serviceIds : null,
    p_for_group_booking: false,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    position: (t.position as string | null) ?? null,
    photoUrl: (t.photo_url as string | null) ?? null,
  }));
}

export async function fetchEngineRooms(branchId: string): Promise<EngineRoom[]> {
  const client = getEngineClient();
  if (!client) return [];
  const { data, error } = await client
    .from("rooms")
    .select("id, capacity")
    .eq("branch_id", branchId)
    .eq("is_active", true);
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, capacity: r.capacity ?? 1 }));
}

/** Number of active rooms, or null if it couldn't be read ("unknown" must not look like "none"). */
export async function fetchEngineRoomCount(branchId: string): Promise<number | null> {
  const client = getEngineClient();
  if (!client) return null;
  const { data, error } = await client.from("rooms").select("id").eq("branch_id", branchId).eq("is_active", true);
  if (error || !data) return null;
  return data.length;
}

/** Adds one day to a YYYY-MM-DD string (UTC-safe, no timezone drift). */
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Collapses a sorted list of closed dates into inclusive ranges. */
export function closedDatesToRanges(dates: string[]): ClosedRange[] {
  const ranges: ClosedRange[] = [];
  for (const date of [...dates].sort()) {
    const last = ranges[ranges.length - 1];
    if (last && nextDay(last.endDate) === date) last.endDate = date;
    else if (!last || date > last.endDate) ranges.push({ startDate: date, endDate: date });
  }
  return ranges;
}

/**
 * Dates the studio is closed to online booking, from book-spa's public_get_closed_dates RPC
 * (migration-390, granted to anon). NOT a direct manual_blocks read: anon has no SELECT policy on
 * that table, so a direct read returns [] and a closed day looks open. The RPC also expands
 * recurrence and exceptions server-side, so we never re-implement them.
 *
 * Returns null when the call fails — "we don't know" must not be treated as "open".
 */
export async function fetchEngineClosedRanges(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<ClosedRange[] | null> {
  const client = getEngineClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_get_closed_dates", {
    p_branch_id: branchId,
    p_start: startDate,
    p_end: endDate,
  });
  if (error || !data) return null;
  return closedDatesToRanges((data as { closed_date: string }[]).map((r) => r.closed_date));
}

/**
 * The branch's own opening hours: branch_working_hours rows exactly as stored plus
 * branches.open_time/close_time as the fallback (both anon-readable by RLS). Mirrors book-spa's
 * fetchBranchSlotHours. Returns null on failure so the drawer can refuse to offer slots rather
 * than guess a default range.
 */
export async function fetchEngineBranchHours(branchId: string): Promise<BranchHours | null> {
  const client = getEngineClient();
  if (!client) return null;
  const [weekly, branch] = await Promise.all([
    client.from("branch_working_hours").select("day_of_week, start_time, end_time, is_day_off").eq("branch_id", branchId),
    client.from("branches").select("open_time, close_time").eq("id", branchId).maybeSingle(),
  ]);
  if (weekly.error || branch.error) return null;
  return {
    weekly: (weekly.data ?? []) as WeeklyHoursRow[],
    openTime: branch.data?.open_time ?? null,
    closeTime: branch.data?.close_time ?? null,
  };
}

/** rooms + bookings for the branch's effective window, in one round trip like book-spa's fetchBranchAvailabilityWindow. */
export async function fetchEngineAvailabilityWindow(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<{ rooms: EngineRoom[]; bookings: EngineBooking[] }> {
  const client = getEngineClient();
  if (!client) return { rooms: [], bookings: [] };
  const [rooms, bookingsRes] = await Promise.all([
    fetchEngineRooms(branchId),
    client.rpc("public_check_branch_bookings_range", {
      p_branch_id: branchId,
      p_start_date: startDate,
      p_end_date: endDate,
    }),
  ]);
  return { rooms, bookings: (bookingsRes.data as EngineBooking[] | null) || [] };
}

export async function fetchEngineTherapistWindow(
  orgSlug: string,
  branchId: string,
  startDate: string,
  endDate: string
): Promise<EngineTherapistBusyRow[]> {
  const client = getEngineClient();
  if (!client) return [];
  const { data, error } = await client.rpc("public_check_therapist_bookings_range", {
    p_org_slug: orgSlug,
    p_branch_id: branchId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error || !data) return [];
  return data as EngineTherapistBusyRow[];
}

export async function fetchEngineGenderHeadcount(
  orgSlug: string,
  branchId: string,
  serviceId: string
): Promise<{ male: number; female: number }> {
  const client = getEngineClient();
  if (!client) return { male: 0, female: 0 };
  const { data, error } = await client.rpc("public_get_service_eligible_gender_headcount", {
    p_org_slug: orgSlug,
    p_branch_id: branchId,
    p_service_id: serviceId,
  });
  if (error || !data) return { male: 0, female: 0 };
  const row = (data as { male_count?: number; female_count?: number }[])[0] ?? {};
  return { male: row.male_count || 0, female: row.female_count || 0 };
}
