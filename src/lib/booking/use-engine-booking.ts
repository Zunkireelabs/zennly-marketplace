"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Provider } from "@/lib/providers";
import { engineBookingEnabled } from "./engine-flag";
import {
  fetchEngineOrg,
  fetchEngineBranches,
  fetchEngineBranchServices,
  fetchEngineAvailabilityWindow,
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
  const active = engineBookingEnabled() && Boolean(provider.engineProviderId);
  const orgSlug = provider.engineProviderId;

  const [enableRooms, setEnableRooms] = useState(true);
  const [branches, setBranches] = useState<EngineBranch[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<EngineBranch | null>(null);

  const [services, setServices] = useState<EngineService[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  const [rooms, setRooms] = useState<EngineRoom[]>([]);
  const [bookings, setBookings] = useState<EngineBooking[]>([]);
  const [closedRanges, setClosedRanges] = useState<ClosedRange[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0 });

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
        if (rows.length === 1) setSelectedBranch(rows[0]);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [active, open, orgSlug]);

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
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const end = new Date(today.getTime() + (advanceBookingDays - 1) * 86400000).toISOString().slice(0, 10);
    Promise.all([
      fetchEngineAvailabilityWindow(selectedBranch.id, start, end),
      fetchEngineClosedRanges(selectedBranch.id),
    ]).then(([window, ranges]) => {
      if (cancelled) return;
      setRooms(window.rooms);
      setBookings(window.bookings);
      setClosedRanges(ranges);
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
    },
    [orgSlug, selectedBranch]
  );

  const needsLocationStep = active && branchesLoaded && branches.length > 1 && !selectedBranch;

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
      availabilityLoaded,
      advanceBookingDays,
      genderCounts,
      loadGenderCounts,
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
      availabilityLoaded,
      advanceBookingDays,
      genderCounts,
      loadGenderCounts,
    ]
  );
}
