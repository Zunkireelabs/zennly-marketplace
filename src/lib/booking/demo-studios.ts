/**
 * Demo studios are listings with no bookX link: made-up content that exists so staging has
 * something to browse. They are off by default. Staging sets NEXT_PUBLIC_SHOW_DEMO_STUDIOS=on;
 * production leaves it unset, so a real customer never sees a studio that isn't real.
 */
export function showDemoStudios(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEMO_STUDIOS === "on";
}

export function isDemoListing(p: { engineProviderId?: string | null }): boolean {
  return !p.engineProviderId;
}

/** Drops demo listings unless the switch is on. */
export function visibleProviders<T extends { engineProviderId?: string | null }>(all: T[]): T[] {
  return showDemoStudios() ? all : all.filter((p) => !isDemoListing(p));
}
