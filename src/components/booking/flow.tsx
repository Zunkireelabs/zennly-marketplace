"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Provider, Service } from "@/lib/providers";
import { useEngineBooking } from "@/lib/booking/use-engine-booking";
import { computeSoloSlots, getNepalToday, minutesToTime24, timeToMinutes, type SoloDay } from "@/lib/booking/engine-availability";
import { createBookingAttempt } from "@/lib/booking/booking-attempt";
import { readBookedSummary, type BookedSummary } from "@/lib/booking/booked-summary";
import { clearResume, saveResume } from "@/lib/booking/booking-resume";
import { bookingErrorMessage, noAnswerRetryMessage } from "@/lib/booking/engine-errors";
import {
  bookUrl,
  datesBetween,
  lastBookableDay,
  parseBookParams,
  type BookParams,
  type BookStep,
} from "@/lib/booking/booking-route";

/**
 * State shared by the booking pages of one connected studio. It lives in the booking layout, so
 * it survives moving between steps; the customer's CHOICES live in the URL (see booking-route.ts).
 * All the real work is done by the ZNLY-333 modules (engine data, availability, booking attempt,
 * booked summary, resume, plain-language errors); this only wires them to the pages.
 */

type Confirmation = { name: string; phone: string; notes: string };

type Flow = {
  provider: Provider;
  engine: ReturnType<typeof useEngineBooking>;
  params: BookParams;
  /** True once the branch in the URL is the engine's selected branch, so branch data is the right branch's. */
  branchReady: boolean;
  multiBranch: boolean;
  service: Service | null;
  totalMinutes: number;
  go: (step: BookStep, params?: BookParams, mode?: "push" | "replace") => void;
  /** Real availability for the whole window; null until everything it needs has loaded. */
  days: SoloDay[] | null;
  minISO: string;
  maxISO: string;
  studioPhone: string | null;
  submitting: boolean;
  confirmError: string | null;
  outcomeUnknown: boolean;
  locked: boolean;
  booked: BookedSummary | null;
  submit: (c: Confirmation, forName: string | null) => Promise<void>;
  rememberForLogin: () => void;
};

const Ctx = createContext<Flow | null>(null);

export function useBookFlow(): Flow {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBookFlow must be used inside <BookFlow>");
  return v;
}

const BOOKED_KEY = "zennly-booked";

function storedBookedRaw(): string | null {
  try {
    return window.sessionStorage.getItem(BOOKED_KEY);
  } catch {
    return null;
  }
}

const noSubscription = () => () => {};

/** The reply kept for this tab, for a done page that was refreshed. Empty on the server. */
export function useStoredBooked(slug: string): BookedSummary | null {
  const raw = useSyncExternalStore(noSubscription, storedBookedRaw, () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as { slug?: string; summary?: BookedSummary };
      return p.slug === slug && p.summary ? p.summary : null;
    } catch {
      return null;
    }
  }, [raw, slug]);
}

function storeBooked(slug: string, summary: BookedSummary) {
  try {
    window.sessionStorage.setItem(BOOKED_KEY, JSON.stringify({ slug, summary }));
  } catch {
    // blocked storage: the done page just shows less after a refresh
  }
}

export function BookFlow({ provider, children }: { provider: Provider; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Keyed provider={provider}>{children}</Keyed>
    </Suspense>
  );
}

// A different branch means different services, hours and availability, so everything branch-scoped
// starts clean: the engine hook's data is simply thrown away with the key.
function Keyed({ provider, children }: { provider: Provider; children: React.ReactNode }) {
  const sp = useSearchParams();
  return (
    <Inner key={sp.get("branch") ?? ""} provider={provider}>
      {children}
    </Inner>
  );
}

function Inner({ provider, children }: { provider: Provider; children: React.ReactNode }) {
  const router = useRouter();
  const sp = useSearchParams();
  const params = useMemo(() => parseBookParams(sp), [sp]);
  const { user, openLogin } = useAuth();
  const engine = useEngineBooking(provider, true);

  // Put the branch named in the URL in place (a one-branch studio is picked by the hook itself).
  const { branches, branchesLoaded, selectedBranch, pickBranch } = engine;
  useEffect(() => {
    if (!branchesLoaded || !params.branch || selectedBranch?.id === params.branch) return;
    const b = branches.find((x) => x.id === params.branch);
    if (b) pickBranch(b);
  }, [branchesLoaded, branches, params.branch, selectedBranch, pickBranch]);
  const branchReady = Boolean(params.branch && selectedBranch?.id === params.branch);

  const service = useMemo(() => provider.services.find((s) => s.id === params.service) ?? null, [provider.services, params.service]);
  const totalMinutes = service ? Math.max(...service.durations) : 0;

  // The headcount of eligible staff is per service (as in the drawer).
  const { loadGenderCounts, genderCountsKey } = engine;
  useEffect(() => {
    if (branchReady && service) loadGenderCounts(service.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchReady, service?.id]);

  const go = useCallback<Flow["go"]>(
    (step, p, mode = "push") => {
      const url = bookUrl(provider.slug, step, p ?? {});
      if (mode === "replace") router.replace(url);
      else router.push(url);
    },
    [provider.slug, router]
  );

  // The bookable window is today (Kathmandu) to today + the branch's advance-booking days.
  const minISO = useMemo(() => getNepalToday(), []);
  const maxISO = lastBookableDay(minISO, engine.advanceBookingDays);

  const days = useMemo(() => {
    if (!branchReady || !selectedBranch || !service || !engine.availabilityLoaded) return null;
    if (genderCountsKey !== `${selectedBranch.id}:${service.id}`) return null;
    return computeSoloSlots({
      dates: datesBetween(minISO, maxISO),
      rooms: engine.rooms,
      bookings: engine.bookings,
      therapistWindowRows: null,
      therapistWindowError: false,
      therapistFilter: null,
      durationMinutes: totalMinutes || 60,
      genderPreference: "no-preference",
      enableRooms: engine.enableRooms,
      therapistCounts: engine.genderCounts,
      closedRanges: engine.closedRanges,
      hours: engine.hours,
      onlineCapacity: selectedBranch.onlineBookingCapacity,
    });
  }, [branchReady, selectedBranch, service, engine, genderCountsKey, minISO, maxISO, totalMinutes]);

  // ---- booking ----
  const attemptRef = useRef(createBookingAttempt());
  const [submitting, setSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [locked, setLocked] = useState(false);
  const [booked, setBooked] = useState<BookedSummary | null>(null);
  const studioPhone = selectedBranch?.phone ?? null;

  const rememberForLogin = useCallback(() => {
    if (!service || !params.date || !params.time) return;
    saveResume({
      slug: provider.slug,
      branchId: params.branch ?? null,
      serviceId: service.id,
      date: params.date,
      minutes: timeToMinutes(params.time),
    });
  }, [provider.slug, params, service]);

  const submit = useCallback<Flow["submit"]>(
    async (c, forName) => {
      if (!user) {
        rememberForLogin();
        openLogin("booking");
        return;
      }
      if (!selectedBranch || !service || !params.date || !params.time) return;
      setConfirmError(null);
      setSubmitting(true);
      let reply: { ok?: boolean; booking?: unknown; errorCode?: string } | null = null;
      try {
        const res = await fetch("/api/booking/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerSlug: provider.slug,
            branchId: selectedBranch.id,
            serviceId: service.id,
            date: params.date,
            startTime: `${params.time}:00`,
            customerName: forName ?? c.name.trim(),
            customerPhone: c.phone.trim(),
            specialRequests: c.notes || null,
            // Same id on every retry of this attempt: the studio's system replays it rather than booking twice.
            clientRequestId: attemptRef.current.key(),
          }),
        });
        reply = await res.json().catch(() => null);
      } catch {
        reply = null;
      }
      const settled = attemptRef.current.settle(reply);
      setLocked(attemptRef.current.locked());
      setSubmitting(false);
      if (settled.kind === "booked") {
        clearResume();
        const summary = readBookedSummary(settled.booking);
        setBooked(summary);
        storeBooked(provider.slug, summary);
        router.replace(bookUrl(provider.slug, "done", { branch: selectedBranch.id }));
      } else if (settled.kind === "refused") {
        setConfirmError(bookingErrorMessage(settled.errorCode));
      } else if (settled.kind === "retry") {
        setConfirmError(noAnswerRetryMessage(studioPhone));
      } else {
        setOutcomeUnknown(true);
      }
    },
    [user, rememberForLogin, openLogin, selectedBranch, service, params, provider.slug, router, studioPhone]
  );

  const value: Flow = {
    provider,
    engine,
    params,
    branchReady,
    multiBranch: engine.branches.length > 1,
    service,
    totalMinutes,
    go,
    days,
    minISO,
    maxISO,
    studioPhone,
    submitting,
    confirmError,
    outcomeUnknown,
    locked,
    booked,
    submit,
    rememberForLogin,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 24-hour "HH:MM" for a slot, the form the URL and the booking request use. */
export function slotTime(s: { time24: string }): string {
  return minutesToTime24(timeToMinutes(s.time24));
}
