"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Provider } from "@/lib/providers";
import { branchBookability, getNepalToday, type Bookability, type BranchHours } from "./engine-availability";
import { initialBranch, needsLocationStep as shouldAskForLocation } from "./engine-branches";
import { isEngineActive } from "./engine-flag";
import {
  fetchEngineOrg,
  fetchEngineBranches,
  fetchEngineBranchServices,
  fetchEngineAvailabilityWindow,
  fetchEngineBranchHours,
  fetchEngineRoomCount,
  fetchEngineClosedRanges,
  fetchEngineGenderHeadcount,
  type EngineBranch,
  type EngineService,
  type EngineBooking,
  type EngineRoom,
  type ClosedRange,
} from "./engine-data";

/**
 * All the engine state a connected provider's drawer needs: branch resolution (book-spa's own
 * auto-select-when-one / BranchGate-when-many behaviour, provider-profile-flow/index.jsx:104-120),
 * branch-scoped services, and the raw ingredients computeSoloSlots (engine-availability.ts)
 * turns into real slots. `active` is false — and every fetch below a no-op — for unconnected
 * providers or with the flag off, so this hook changes nothing about today's drawer unless both
 * are true.
 *
 * Each "Loaded" flag is set to true only inside its fetch's success path, never reset to false
 * synchronously at the top of an effect — React's set-state-in-effect rule flags that pattern
 * (an unconditional setState as the first line of an effect body can cascade an extra render),
 * and the realistic case it would guard against here (branch A's data still showing while
 * branch B's fetch is in flight) is a brief, harmless staleness during a within-drawer branch
 * change, not a correctness issue.
 */
export function useEngineBooking(provider: Provider, open: boolean) {
  const active = isEngineActive(provider.engineProviderId);
  const orgSlug = provider.engineProviderId;

  const [enableRooms, setEnableRooms] = useState(true);
  const [branches, setBranches] = useState<EngineBranch[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<EngineBranch | null>(null);

  const [services, setServices] = useState<EngineService[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  const [rooms, setRooms] = useState<EngineRoom[]>([]);
  const [bookings, setBookings] = useState<EngineBooking[]>([]);
  // null = couldn't be loaded; the drawer then offers no slots rather than guessing.
  const [closedRanges, setClosedRanges] = useState<ClosedRange[] | null>(null);
  const [hours, setHours] = useState<BranchHours | null>(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0 });
  // "branchId:serviceId" the headcount above was loaded for, so a caller can wait for the RIGHT one.
  const [genderCountsKey, setGenderCountsKey] = useState<string | null>(null);

  // Which branches can take online bookings at all, so the location step can disable the ones that
  // can't (all days off, no hours set, no rooms) instead of leading to empty days. Only read when
  // there is a location step to show. A branch we couldn't read stays choosable.
  const [branchStatus, setBranchStatus] = useState<Record<string, Bookability>>({});

  // Org settings (enableRooms) and branches, once per provider while the drawer is open.
  useEffect(() => {
    if (!active || !open || !orgSlug) return;
    let cancelled = false;
    // Branches are looked up by org_id, which this also resolves from the slug.
    fetchEngineOrg(orgSlug).then((org) => {
      if (cancelled) return;
      if (!org) {
        setBranchesLoaded(true);
        return;
      }
      setEnableRooms(org.enableRooms);
      fetchEngineBranches(org.id).then((rows) => {
        if (cancelled) return;
        setBranches(rows);
        setBranchesLoaded(true);
        // Auto-select only when unambiguous — same reasoning as book-spa's own
        // provider-profile-flow/index.jsx:104-120: silently picking the first of several
        // branches risks a customer booking the wrong location with no way to tell.
        const only = initialBranch(rows);
        if (only) setSelectedBranch(only);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [active, open, orgSlug]);

  useEffect(() => {
    if (!active || !open || branches.length < 2) return;
    let cancelled = false;
    Promise.all(
      branches.map(async (b) => {
        const [branchHours, roomCount] = await Promise.all([fetchEngineBranchHours(b.id), fetchEngineRoomCount(b.id)]);
        return [b.id, branchBookability({ hours: branchHours, roomCount, enableRooms })] as const;
      })
    ).then((entries) => {
      if (!cancelled) setBranchStatus(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [active, open, branches, enableRooms]);

  // Branch-scoped services, whenever the branch changes.
  useEffect(() => {
    if (!active || !orgSlug || !selectedBranch) return;
    let cancelled = false;
    fetchEngineBranchServices(orgSlug, selectedBranch.id).then((rows) => {
      if (cancelled) return;
      setServices(rows);
      setServicesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active, orgSlug, selectedBranch]);

  // Rooms + bookings + closed ranges for the branch's effective advance-booking window — fetched
  // once per branch, not per date click, mirroring book-spa's own DateTimeSelection.jsx.
  const advanceBookingDays = selectedBranch?.advanceBookingDays ?? 30;
  useEffect(() => {
    if (!active || !selectedBranch) return;
    let cancelled = false;
    // Kathmandu's date, not the UTC date: the studio's days run on Kathmandu time.
    const start = getNepalToday();
    const [y, m, d] = start.split("-").map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + advanceBookingDays)).toISOString().slice(0, 10);
    Promise.all([
      fetchEngineAvailabilityWindow(selectedBranch.id, start, end),
      fetchEngineClosedRanges(selectedBranch.id, start, end),
      fetchEngineBranchHours(selectedBranch.id),
    ]).then(([window, ranges, branchHours]) => {
      if (cancelled) return;
      setRooms(window.rooms);
      setBookings(window.bookings);
      setClosedRanges(ranges);
      setHours(branchHours);
      setAvailabilityLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active, selectedBranch, advanceBookingDays]);

  const pickBranch = useCallback((branch: EngineBranch) => setSelectedBranch(branch), []);

  /** Fetches the gender-eligible headcount for one service at the selected branch. */
  const loadGenderCounts = useCallback(
    async (serviceId: string) => {
      if (!orgSlug || !selectedBranch) return;
      const counts = await fetchEngineGenderHeadcount(orgSlug, selectedBranch.id, serviceId);
      setGenderCounts(counts);
      setGenderCountsKey(`${selectedBranch.id}:${serviceId}`);
    },
    [orgSlug, selectedBranch]
  );

  const needsLocationStep = active && shouldAskForLocation(branchesLoaded, branches.length, Boolean(selectedBranch));

  return useMemo(
    () => ({
      active,
      enableRooms,
      branches,
      branchesLoaded,
      selectedBranch,
      pickBranch,
      needsLocationStep,
      services,
      servicesLoaded,
      rooms,
      bookings,
      closedRanges,
      hours,
      availabilityLoaded,
      advanceBookingDays,
      genderCounts,
      genderCountsKey,
      loadGenderCounts,
      branchStatus,
    }),
    [
      active,
      enableRooms,
      branches,
      branchesLoaded,
      selectedBranch,
      pickBranch,
      needsLocationStep,
      services,
      servicesLoaded,
      rooms,
      bookings,
      closedRanges,
      hours,
      availabilityLoaded,
      advanceBookingDays,
      genderCounts,
      genderCountsKey,
      loadGenderCounts,
      branchStatus,
    ]
  );
}
