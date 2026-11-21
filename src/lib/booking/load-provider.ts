import "server-only";
import type { Provider } from "@/lib/providers";
import { engineBookingEnabled } from "./engine-flag";
import { fetchLiveServices } from "./engine-live-services";

/**
 * Live services/prices for connected providers only, written onto the provider in place. This
 * fetch is deliberately cache: "no-store" (see engine-live-services.ts), so a page that calls it
 * renders dynamically per request instead of from the 300s ISR cache. Unconnected providers never
 * reach the fetch and keep their normal static/ISR behaviour. Shared by the studio page and the
 * booking pages, so both always show the same services and prices.
 */
export async function applyLiveServices(provider: Provider): Promise<void> {
  if (!provider.engineProviderId) return;
  const live = await fetchLiveServices(provider.engineProviderId, { scopeToBranches: engineBookingEnabled() });
  if (live) {
    provider.services = live.services;
    provider.serviceCategories = live.serviceCategories;
    provider.fromPrice = live.fromPrice;
    provider.branchHours = live.branchHours ?? undefined;
  }
}
