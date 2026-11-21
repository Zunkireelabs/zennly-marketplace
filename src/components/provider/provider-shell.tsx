"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { startBooking, type ForWhom } from "@/lib/booking/start-booking";
import type { Provider, Service } from "@/lib/providers";
import { BookingDrawer } from "./booking-drawer";
import { GalleryLightbox } from "./gallery-lightbox";
import { TourModal } from "./tour-modal";

export type BookingStep = "location" | "services" | "time" | "confirm" | "done";

type UiContext = {
  provider: Provider;
  /* booking */
  bookingOpen: boolean;
  step: BookingStep;
  selectedIds: string[];
  selectedServices: Service[];
  totalPrice: number;
  totalMinutes: number;
  dateISO: string | null;
  time: string | null;
  forWhom: ForWhom;
  setForWhom: (forWhom: ForWhom) => void;
  openBooking: (opts?: { serviceId?: string }) => void;
  closeBooking: () => void;
  setStep: (step: BookingStep) => void;
  toggleService: (id: string) => void;
  chooseService: (id: string) => void;
  setDateISO: (iso: string | null) => void;
  setTime: (time: string | null) => void;
  resetBooking: () => void;
  /** Reopens the drawer with previously chosen service/day/time at a given step (resume after a
   *  login redirect). Does not go through startBooking, so no "Book clicked" event is recorded. */
  /** A one-line notice for the booking drawer ("That time is no longer available"). */
  notice: string | null;
  setNotice: (notice: string | null) => void;
  restoreBooking: (opts: { serviceId: string; dateISO: string; time: string | null; step: BookingStep }) => void;
  /** book-spa's handleBranchSelect clears service/time on a branch (re)pick, since both are
   * branch-scoped (provider-profile-flow/index.jsx). Only meaningful for connected providers'
   * location step; unused otherwise. */
  clearServiceSelection: () => void;
  /* gallery */
  galleryOpen: boolean;
  galleryIndex: number;
  openGallery: (index?: number) => void;
  closeGallery: () => void;
  setGalleryIndex: (index: number) => void;
  /* virtual tour */
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
};

const Ctx = createContext<UiContext | null>(null);

export function useProviderUi(): UiContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useProviderUi must be used inside <ProviderShell>");
  return value;
}

/**
 * Holds the booking drawer + photo lightbox state for one provider page, so any Book button or
 * "View all photos" button, wherever it sits on the page, opens the same shared overlay.
 * Showcase-only: nothing here is persisted or sent anywhere (docs/PRODUCT_CONTEXT.md §4).
 */
export function ProviderShell({ provider, children }: { provider: Provider; children: React.ReactNode }) {
  const router = useRouter();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [forWhom, setForWhom] = useState<ForWhom>({ kind: "me" });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    track("provider_viewed", { slug: provider.slug });
  }, [provider.slug]);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);

  const selectedServices = useMemo(
    () => provider.services.filter((s) => selectedIds.includes(s.id)),
    [provider.services, selectedIds]
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalMinutes = selectedServices.reduce((sum, s) => sum + Math.max(...s.durations), 0);

  const clearSlot = useCallback(() => {
    setTime(null);
  }, []);

  // Every Book button ends up here, and this goes through startBooking() (never straight to a URL).
  const openBooking = useCallback<UiContext["openBooking"]>(
    (opts) => {
      const serviceIds = opts?.serviceId ? [opts.serviceId] : selectedIds;
      const result = startBooking({ provider, selection: { serviceIds }, forWhom });
      if (result.kind === "blocked") {
        toast.error(result.reason);
        return;
      }
      if (result.kind === "external") return;
      // A connected studio: continue on its booking pages, same tab (ZNLY-338). The drawer below
      // is now only the demo path for studios with no live booking system.
      if (result.kind === "page") {
        router.push(result.url);
        return;
      }
      if (opts?.serviceId) {
        setSelectedIds((ids) => (ids.includes(opts.serviceId!) ? ids : [opts.serviceId!]));
        setStep("time");
      } else {
        setStep(selectedIds.length > 0 ? "time" : "services");
      }
      setBookingOpen(true);
    },
    [provider, selectedIds, forWhom, router]
  );

  const closeBooking = useCallback(() => setBookingOpen(false), []);

  const toggleService = useCallback(
    (id: string) => {
      setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
      clearSlot();
    },
    [clearSlot]
  );

  const chooseService = useCallback(
    (id: string) => {
      setSelectedIds(id ? [id] : []);
      clearSlot();
    },
    [clearSlot]
  );

  const clearServiceSelection = useCallback(() => {
    setSelectedIds([]);
    setTime(null);
  }, []);

  const resetBooking = useCallback(() => {
    setSelectedIds([]);
    setDateISO(null);
    setTime(null);
    setStep("services");
    setForWhom({ kind: "me" });
    setNotice(null);
  }, []);

  const restoreBooking = useCallback<UiContext["restoreBooking"]>((opts) => {
    setSelectedIds([opts.serviceId]);
    setDateISO(opts.dateISO);
    setTime(opts.time);
    setStep(opts.step);
    setBookingOpen(true);
  }, []);

  const openGallery = useCallback((index = 0) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }, []);

  const openTour = useCallback(() => setTourOpen(true), []);
  const closeTour = useCallback(() => setTourOpen(false), []);

  const value: UiContext = {
    provider,
    bookingOpen,
    step,
    selectedIds,
    selectedServices,
    totalPrice,
    totalMinutes,
    dateISO,
    time,
    forWhom,
    setForWhom,
    openBooking,
    closeBooking,
    setStep,
    toggleService,
    chooseService,
    setDateISO,
    setTime,
    resetBooking,
    restoreBooking,
    notice,
    setNotice,
    clearServiceSelection,
    galleryOpen,
    galleryIndex,
    openGallery,
    closeGallery: () => setGalleryOpen(false),
    setGalleryIndex,
    tourOpen,
    openTour,
    closeTour,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <BookingDrawer />
      <GalleryLightbox />
      <TourModal />
    </Ctx.Provider>
  );
}
