# Booking integration — marketplace ↔ book-spa

## Context

Today a customer browsing `zennly.io` can reach a studio page, but "Book now" opens a local
simulator: `src/components/provider/booking-drawer.tsx` synthesizes opening hours, marks one slot
in four as taken via a hash, and on confirm just sets `step = "done"` without any network call.
Its own success screen says so. Meanwhile book-spa runs the real booking flow at
`app.zennly.io/:orgSlug` — location picker, services, professional, date/time, confirm — against
the database that holds every business's actual customers and bookings.

The goal is for a customer to book from the marketplace without that work being duplicated or the
two systems disagreeing about what's available.

Two facts shape everything below:

**book-spa's reads are already a public API.** Anon-granted `SECURITY DEFINER` RPCs are callable
over PostgREST today with no backend work: `public_get_bookable_services`,
`public_get_bookable_therapists`, `public_check_branch_bookings_range`,
`public_check_therapist_bookings_range`, `public_get_service_eligible_gender_headcount`. Real
outlets, real services, real NPR prices, real availability — all reachable now.

**Writes are not.** There is no `public_create_booking`. Creation is ~670 lines of browser JS
(`book-spa/src/services/api.js:5746-6400`): customer-identity dedup with 23505 race handling, room
auto-assignment with capacity counting, transfer-aware therapist branch resolution over
`staff_transfers`, service↔staff eligibility, price snapshots, referral recording, and a
no-`SELECT` + `client_request_id` read-back because anon cannot read `bookings`. Multi-service
booking isn't transactional — it loops and compensates.

One thing materially de-risks this: **the database is the serialization point, not the JS.** An
`EXCLUDE` constraint plus capacity triggers (`23P01`, `P0003`, `P0005`, `P0006`) reject conflicts
with specific error codes. book-spa has no locks and no slot holds — its own availability is
advisory and client-side. So a second client cannot cause double bookings; the worst case is the
"slot just taken" error book-spa customers can already hit.

---

## Stage 0 — Provider ↔ org mapping (BLOCKS EVERYTHING)

`engineProviderId` is `NULL` on every row and read nowhere in the codebase. The marketplace's
catalog is generated placeholder data — `providers-seed.ts` builds services from per-modality
*templates*, so every massage studio carries the same seven services at the same USD prices, with
positional IDs (`${slug}-0`, `-1`, …) that regenerate on reseed. `hours` are unparseable display
strings. There is no outlet model: one address per provider.

Nothing works until real marketplace Providers correspond to real book-spa orgs. This is a data
and product decision, not a coding task:

- Which studios are real, engine-connected businesses vs. demo content? Nuad Thai Spa is a real
  book-spa tenant with three outlets (Bhaisepati, Lazimpat, Sanepa); the seeded studios are not.
- For connected providers, which fields stay marketplace-owned (gallery, editorial copy, tone,
  collections) and which come live from the engine (services, prices, hours, availability)?
- Populate `engineProviderId` with the book-spa org slug or id, and map it in `toProvider()`
  (`src/lib/providers-data.ts`) — it currently sets 29 fields and omits this one.

Recommendation: treat `engineProviderId != null` as the switch. Connected providers read their
bookable data from the engine; everyone else keeps today's behavior. That keeps demo content
working while real studios go live one at a time.

## Stage 1 — Handoff (~1 day)

Ship this first regardless of whether Stage 2 follows. It produces real bookings immediately with
zero duplicated logic, and proves the Stage 0 mapping is correct before anything expensive is
built on top of it.

The seam already exists. `src/lib/booking/start-booking.ts` is a single chokepoint that fires a
`book_clicked` event, then opens `provider.bookingUrl` with `?source=zennly&handoff_id=<uuid>&for=me|other`
appended. Two reasons it's unreachable today: `BOOKING_HOST_ALLOWLIST` is an empty array
(`start-booking.ts:32`), and `bookingUrl` is declared on the type but never mapped, so it's always
`undefined`.

1. Derive `bookingUrl` from `engineProviderId` (e.g. `https://app.zennly.io/<orgSlug>`) and map it
   in `toProvider()`.
2. Add the engine host to `BOOKING_HOST_ALLOWLIST`.
3. Leave the demo drawer as the fallback for unconnected providers — `startBooking` already
   branches that way (`kind: "external"` vs `kind: "drawer"`).

Optionally have book-spa record `handoff_id` so marketplace-originated bookings are attributable.
Not required for Stage 1 to work.

**This does not deliver booking inside the marketplace.** The customer lands in book-spa's UI on
the `app.` subdomain. It is a stepping stone, not the destination.

## Stage 2 — Native booking (~2-3 weeks, both repos)

The drawer already exists and is well built — four steps, calendar, slot grid, guest and
attendee forms, auth prefill, analytics. What changes is where its data comes from and what
confirm does.

### Marketplace side

- **Engine read client.** A second Supabase client pointed at book-spa's project with its anon
  key, used only for the `public_*` RPCs. Keep it isolated from the marketplace's own client
  (`src/lib/supabase/`) — different project, different keys, read-only.
- **Location step (new).** The drawer jumps straight to services; book-spa's flow is
  location-first. Fetch branches for the org, render the picker, and auto-select when there's
  only one — book-spa does exactly this (`provider-profile-flow/index.jsx:104-120`), so match the
  behavior. Branches come live from the engine; no marketplace schema change needed.
- **Services from the engine.** For connected providers, source from
  `public_get_bookable_services(org_slug)` and use engine service IDs throughout. Do not reuse
  the seed's positional IDs for these providers — they're unstable and meaningless to the engine.
- **Professional step.** Optional in book-spa, gated on the org's `show_staff_selection` setting.
  Mirror that rather than always showing it.
- **Real availability.** Replace `hoursFor()` and `isTaken()` with the range RPCs plus the
  occupancy math. See the risk note below.
- **Currency.** Engine prices are NPR (`effective_price_npr`); the marketplace renders USD via a
  client-side converter. Connected providers must show the engine's real NPR price, not a
  converted template price.
- **Confirm → write.** Replace `setStep("done")` with a call to the new creation endpoint, and map
  its error codes to the messages the drawer already knows how to show.
- Provider pages are ISR'd at 300s (`revalidate = 300`), so every one of these reads must happen
  client-side in the drawer, never in the page body.

### book-spa side

- **`public_create_booking`** — the one genuinely missing piece. An RPC or Edge Function wrapping
  the existing creation logic server-side, preserving customer dedup, room assignment,
  transfer-aware therapist resolution, eligibility, snapshots, and the existing error-code
  taxonomy so callers can map failures precisely.
- Long term, book-spa's own flow should call this too, so there is one implementation rather than
  two. That migration can follow rather than block.

### Out of scope for Stage 2

Group booking (2-6 people) exists in book-spa as a parallel flow with its own state and
`submitGroupBooking`. Skip it initially — single customer, multi-service only. Revisit once the
single path is proven.

---

## Risks

- **Availability math duplication.** book-spa computes slots client-side (`availability.js`,
  `therapistAvailability.js`) from room capacity, gender headcount and branch online capacity. If
  the marketplace reimplements this differently it will offer slots the engine then rejects.
  Mitigation: port it deliberately as a shared copy and accept the DB as the backstop — book-spa
  has the same race today. Better long-term: expose availability as a server-side RPC too.
- **Two creation paths until book-spa migrates.** Bounded by the DB constraints being
  authoritative, so this risks inconsistent *behavior*, not corrupt data.
- **Catalog divergence.** Once services come live from the engine, marketplace search and
  `fromPrice` still read seeded values. Decide whether connected providers' search/filter data is
  refreshed from the engine on a schedule, or whether those fields stay editorial.

## Verification

- A booking made from the marketplace appears in book-spa's dashboard under the right org, branch,
  service, staff and time — checked in the actual dashboard, not just a 200 response.
- The customer record lands in that org's customer list, deduped by phone against an existing
  customer rather than creating a duplicate.
- Booking the same slot twice surfaces the engine's real conflict error, not a generic failure.
- A single-branch org skips the location step; a three-branch org (Nuad Thai Spa) shows all three
  with correct open/closed state.
- An unconnected provider still gets the demo drawer and no engine calls are made.
- Prices shown match the engine's NPR values exactly, including tiered pricing when a specific
  professional is chosen.

## Sequencing

Stage 0, then Stage 1, then Stage 2 — but note the `/businesses` consolidation still has an
unshipped deployment phase (Dockerfile, CI, Traefik cutover). Stage 1 touches only marketplace
code and can land alongside it. Stage 2 spans two repos and should not start until the domain
cutover is done and stable, or you'll be debugging two moving systems at once.
