import Link from "next/link";
import type { Provider } from "@/lib/providers";
import { isEngineActive } from "@/lib/booking/engine-flag";
import { ChevronIcon, ClockIcon, PinIcon, StarIcon } from "./icons";
import { SaveShare } from "./hero-actions";
import { AmenityIcon } from "./amenity-icons";

const OVERLINE =
  "font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function Breadcrumb({ provider }: { provider: Provider }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-5 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="hover:text-foreground hover:underline">
            Home
          </Link>
        </li>
        <li aria-hidden>›</li>
        <li>{provider.modality}</li>
        <li aria-hidden>›</li>
        <li>{provider.city}</li>
        <li aria-hidden>›</li>
        <li aria-current="page" className="font-medium text-foreground">
          {provider.name}
        </li>
      </ol>
    </nav>
  );
}

export function Overview({ provider }: { provider: Provider }) {
  return (
    <section id="overview" className="scroll-mt-20 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-normal leading-[1.15] tracking-[-0.01em] sm:text-[44px]">
            {provider.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              {!provider.isNew && (
                <>
                  <StarIcon width={15} height={15} className="text-warning" />
                  <span className="font-semibold tabular-nums">{provider.rating.toFixed(1)}</span>
                </>
              )}
              <span className="text-muted-foreground">
                {provider.isNew ? "New to Zennly" : `${provider.reviewCount} reviews`}
              </span>
            </span>
            {/* Names the areas a multi-outlet studio trades in rather than implying one.
                Deliberately NOT a count: `areas` is a search aid, and may hold a municipality
                (Nuad lists Lalitpur so someone there finds it) alongside actual branches — so
                "5 locations" would claim an outlet that doesn't exist. A real outlet count
                would have to come from book-spa's branches, not from this field.
                Plain text, too: the branch is chosen in the booking flow, which is already
                branch-aware, and a second place to pick one would be a trap. */}
            <span className="flex items-center gap-1.5">
              <PinIcon width={15} height={15} />
              {provider.areas && provider.areas.length > 1
                ? `${provider.areas.slice(0, 3).join(", ")}${provider.areas.length > 3 ? "…" : ""}`
                : provider.location}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon width={15} height={15} />
              Open 7 days
            </span>
          </p>
        </div>
        <SaveShare slug={provider.slug} name={provider.name} />
      </div>

      {(provider.isRecommended || provider.isNew) && (
        <p className="mt-4 flex gap-2">
          {provider.isRecommended && (
            <span className="rounded-[var(--radius-full)] bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-accent-foreground">
              Recommended
            </span>
          )}
          {provider.isNew && (
            <span className="rounded-[var(--radius-full)] bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              New to Zennly
            </span>
          )}
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {provider.features.map((feature) => (
          <li key={feature.label} className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3">
            <p className="text-sm font-semibold">{feature.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{feature.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex max-w-prose flex-col gap-4 text-base leading-relaxed">
        {provider.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className={`${OVERLINE} mr-1`}>Great for</span>
        {provider.greatFor.map((tag) => (
          <span
            key={tag}
            className="rounded-[var(--radius-full)] border border-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Amenities({ provider }: { provider: Provider }) {
  return (
    <section id="amenities" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Amenities</h2>
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {provider.amenities.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm">
            <AmenityIcon name={item} width={20} height={20} className="shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Location({ provider }: { provider: Provider }) {
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${provider.name} ${provider.address}`
  )}`;

  return (
    <section id="location" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Location</h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-[1.2fr_1fr]">
        {/* Placeholder map tile: a static block in the provider's own tone instead of an embedded
            map, since the showcase has no map provider wired up yet. */}
        <div
          className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-[var(--radius-lg)]"
          style={{ background: provider.tone }}
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(var(--card) 1px, transparent 1px), linear-gradient(90deg, var(--card) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-primary text-primary-foreground shadow-[var(--shadow-floating)]">
            <PinIcon width={22} height={22} />
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold">{provider.address}</p>
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Get directions
            </a>
          </div>

          <div>
            <h3 className={OVERLINE}>Nearby</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {provider.nearby.map((place) => (
                <li key={place.label} className="flex justify-between gap-4 text-sm">
                  <span>{place.label}</span>
                  <span className="text-muted-foreground">{place.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={OVERLINE}>Opening hours</h3>
            {isEngineActive(provider.engineProviderId) ? (
              // A connected studio's hours come from book-spa, per branch, by the drawer's own rule.
              // The seeded `hours` is a stale copy, so if the live read failed we show nothing
              // rather than hours the booking drawer might not honour.
              provider.branchHours ? (
                <div className="mt-2 flex flex-col gap-4">
                  {provider.branchHours.map((b) => (
                    <div key={b.branch}>
                      {provider.branchHours!.length > 1 && <p className="text-sm font-semibold">{b.branch}</p>}
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {b.hours.map((row) => (
                          <li key={row.day} className="flex justify-between gap-4 text-sm">
                            <span>{row.day}</span>
                            <span className="text-muted-foreground tabular-nums">{row.open}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Opening hours are shown when you pick a time to book.</p>
              )
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {provider.hours.map((row) => (
                  <li key={row.day} className="flex justify-between gap-4 text-sm">
                    <span>{row.day}</span>
                    <span className="text-muted-foreground tabular-nums">{row.open}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const CANCELLATION = [
  { tone: "bg-primary", when: "24 hours or more before", what: "Full refund" },
  { tone: "bg-warning", when: "12 to 24 hours before", what: "50% refund" },
  { tone: "bg-error", when: "Under 12 hours", what: "No refund" },
];

const POLICY_FAQ = [
  {
    q: "How does booking work?",
    a: "Choose your services, pick a day and time, and confirm. You get an email right away. The studio holds your slot until your visit.",
  },
  {
    q: "How do I pay?",
    a: "You pay at the studio after your visit. Cards and cash are accepted. Nothing is charged when you book.",
  },
  {
    q: "What if I'm running late?",
    a: "The studio holds your slot for 15 minutes. After that your visit may be shortened so the next guest isn't kept waiting.",
  },
  {
    q: "Is there anything I should tell the studio?",
    a: "Yes. Mention injuries, pregnancy, allergies or sensitivities in the notes when you book, and the team will adjust your treatment.",
  },
];

// A connected studio has no online payment and no cancel path on this site, so none of the demo
// refund tiers, "you get an email", or "we hold your slot" promises apply. Only what is true.
const CONNECTED_POLICY_FAQ = [
  {
    q: "How does booking work?",
    a: "Choose a service, pick a day and time, and confirm. You'll see your booking number on screen. To change or cancel, contact the studio.",
  },
  {
    q: "How do I pay?",
    a: "You pay at the studio. Nothing is charged when you book.",
  },
  POLICY_FAQ[3],
];

export function Policies({ provider }: { provider: Provider }) {
  const connected = isEngineActive(provider.engineProviderId);
  const faq = connected ? CONNECTED_POLICY_FAQ : POLICY_FAQ;
  return (
    <section id="policies" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Cancellation and policies</h2>

      {connected ? (
        <p className="mt-5 rounded-[var(--radius-md)] border border-border bg-card p-4 text-sm">
          You pay at the studio. To change or cancel, contact the studio.
        </p>
      ) : (
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {CANCELLATION.map((step) => (
            <li key={step.when} className="rounded-[var(--radius-md)] border border-border bg-card p-4">
              <span className={`block h-1.5 w-10 rounded-[var(--radius-full)] ${step.tone}`} aria-hidden />
              <p className="mt-3 text-sm font-semibold">{step.what}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{step.when}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 divide-y divide-border border-y border-border">
        {faq.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronIcon className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
