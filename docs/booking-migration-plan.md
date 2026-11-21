# Moving customer booking + login from book-spa to the marketplace

## Context

Today a customer books at `app.zennly.io/<orgSlug>` — book-spa's own flow, with book-spa's own
customer login. The marketplace has a booking drawer, but it's a simulator: it synthesizes opening
hours, marks slots taken with a hash, and on confirm saves nothing.

The decision is to invert that. Customer-facing booking and login become the marketplace's; book-spa
keeps everything operational — the booking record, room and therapist allocation, each business's
client list, memberships, payments, reports — and loses its customer-facing surface.

Nuad Thai Spa and Sbal are the production tenants, and both are listed in the marketplace. So no
business is stranded by the removal, provided it happens in the right order.

**Ordering is the whole risk.** `app.zennly.io/<orgSlug>` is live and taking real bookings. The
replacement must work before the original goes. Removing first is the one sequence that can leave a
real business unable to take bookings.

## Already done

- Marketplace customer login — email + Google. Working. (Email currently sends a sign-in link, not a
  code; switching to codes needs custom SMTP on the Supabase project — config, not code.)
- `app.zennly.io` handoff from studio pages (`startBooking`, allowlist, `engineProviderId`).
- Past bookings + membership on studio pages, via book-spa's new lookup endpoint (`1ae35ee` here,
  endpoint in flight on book-spa's `zennly-connectors`).

---

## Phase 1 — Real booking in the marketplace

### Marketplace

The drawer exists (`src/components/provider/booking-drawer.tsx`, four steps, calendar, slot grid,
guest forms, auth prefill). What changes is where its data comes from and what confirm does.

- **Engine read client.** A second Supabase client against book-spa's project, anon key, used only
  for the `public_*` RPCs. Isolated from the marketplace's own client. Reachability already proven.
- **Location step (new).** The drawer jumps straight to services; book-spa is location-first. Fetch
  branches, render the picker, auto-select when there's one — book-spa does exactly this
  (`provider-profile-flow/index.jsx:104-120`); match the behavior. Nuad Thai has four active
  branches (Lazimpat, Sanepa, Bhaisepati, Thamel); Sbal has one.
- **Services from the engine.** `public_get_bookable_services(org_slug)` — 196 for Nuad Thai, 53 for
  Sbal. Use engine service ids, never the seed's positional ones.
- **Professional step.** Gated on the org's `show_staff_selection` setting, as book-spa does.
- **Real availability.** Replace `hoursFor()` and `isTaken()` with the range RPCs plus the occupancy
  math. See Risks.
- **Currency.** Engine prices are NPR. The marketplace renders USD via a client-side converter.
  Connected providers must show the engine's real NPR price.
- **Confirm → write.** Call the new creation endpoint; map its error codes to messages.
- Provider pages are ISR'd at 300s, so all of this must happen client-side in the drawer.

### book-spa (`zennly-connectors`)

- **`public_create_booking`** — server-side creation wrapping the logic currently in
  `createBooking` (`api.js:5746-6400`): customer dedup, room auto-assignment, transfer-aware
  therapist branch resolution, eligibility, price snapshots, and the existing error-code taxonomy.
- Record the marketplace customer against the booking so the history lookup keeps working.
- Additive. `createBooking` and the existing flow keep working untouched during this phase.

### Group booking — IN scope (confirmed 18 Nov)

Nuad Thai takes group bookings, so this has to be rebuilt, not dropped. In book-spa it's a
parallel flow with its own state:

- `GroupEntryChoice` (solo vs group prompt), gated on `GROUP_BOOKING_ENABLED` and the org's
  `enable_group_booking` setting
- `GroupBookingView/**` — `GuestsStep`, `GroupProfessionalStep`, `GroupTimeStep`,
  `GroupConfirmStep`, `GroupSummaryCard` (~370 lines plus steps)
- `submitGroupBooking` (`api.js:6501`) — creates one booking per guest sharing a group id, with
  only the lead carrying the customer account link
- `utils/groupAvailability.js` — separate occupancy maths

**The availability maths is the part that differs most, and it affects Phase 1's design now, not
later.** A solo booking needs one slot free. A group of four needs four therapists and enough
room capacity *simultaneously*, subject to the same gender-headcount and branch online-capacity
limits. Build the occupancy model so group is expressible from the start rather than retrofitting
a party-size dimension onto a single-slot assumption.

book-spa needs a group creation endpoint alongside `public_create_booking`. Note `submitGroupBooking`
is explicitly **not transactional** — it creates rows in a loop and compensates via
`public_cancel_booking_group`, returning `BOOKING_GROUP_PARTIAL` if even the rollback fails. That
partial-failure path has to be preserved and surfaced, not quietly swallowed.

Adds roughly a week to the marketplace side and a few days to book-spa.

## Phase 2 — Run both, then switch

- Both flows live simultaneously. Same database, same constraints, so no conflict — book-spa's
  `EXCLUDE` constraint and capacity triggers arbitrate regardless of which client wrote the row.
- Book real appointments through the marketplace against staging, then production.
- Verify in book-spa's dashboard: right org, branch, service, staff, time; customer deduped by
  phone rather than duplicated; conflicts surface the engine's real error.
- Only once that's boring and uneventful, point customers at the marketplace.

## Phase 3 — Remove from book-spa

Last, and only after Phase 2 is proven. A separate branch from `zennly-connectors`, reviewed on its
own.

Removes roughly 6,500 lines plus routes:

- `/:orgSlug/book`, `/:orgSlug` → `CustomerBookingFlowV2`, `provider-profile-flow/**`
  (BranchGate, BookingView, GroupBookingView, ProfessionalStep, DateTimeStep, ConfirmStep)
- Reused v1 components: `DateTimeSelection`, `CustomerForm`, `BookingConfirmation`, `BookingSuccess`
- `CustomerAuthContext`, `supabaseCustomer` client, customer login/signup routes
- `/:orgSlug/account` — book-spa's own customer account page

**Redirects are mandatory, not optional.** Businesses have shared `app.zennly.io/<orgSlug>` links —
in Google listings, QR codes, Instagram bios, printed cards. Those must 301 to the marketplace
studio page, or customers hit a dead end. Enumerate them before removing anything.

**Also check before removing:** whether `customer_accounts` rows exist in production. If real
customers have book-spa logins today, removing that flow strips their access to their own history
unless they re-register on the marketplace. That's a migration question, not a deletion question.

---

## Risks

- **Availability math duplication.** book-spa computes slots client-side from room capacity, gender
  headcount and branch online capacity. Reimplemented differently, the marketplace offers slots the
  engine rejects. Port it deliberately; the DB is the backstop. book-spa has the same race today.
- **Two creation paths during Phase 2.** Bounded by DB constraints being authoritative — risks
  inconsistent behavior, not corrupt data. Ends when Phase 3 removes one.
- **Group booking disappears** unless explicitly scoped back in.
- **Phone login.** Clients are identified by phone in book-spa (`customers` is uniquely indexed on
  org + normalized phone; email has no unique index, and many clients have no email at all). Until
  the marketplace has phone login, booking history and membership lookups will miss most existing
  customers. This affects perceived quality more than correctness, but it will look broken.

## Verification

- A marketplace booking appears correctly in book-spa's dashboard — checked in the dashboard, not
  by HTTP status.
- The customer record deduplicates against an existing client rather than creating a second one.
- Double-booking the same slot surfaces the engine's real conflict error.
- Single-branch org skips the location step; Nuad Thai shows all four outlets with correct
  open/closed state.
- Prices match the engine's NPR values exactly, including tiered pricing per professional.
- Unconnected providers still get the demo drawer and make zero engine calls.
- After Phase 3: every old `app.zennly.io/<orgSlug>` URL redirects rather than 404s.

---

## URL architecture — decided 2026-11-19

```
zennly.io/                      marketplace
zennly.io/businesses/*          marketing site (mirrored from web-zenly)
zennly.io/book/<orgSlug>        customer booking — THE ONLY customer booking URL
app.zennly.io/<orgSlug>/login   staff login, at the root
app.zennly.io/<orgSlug>         301 -> zennly.io/book/<orgSlug>
```

One consumer domain, one business domain. Customers never change host mid-journey; staff keep
the root URLs they already use.

**This needs two deployments of book-spa from the same code**, differing only by
`VITE_BASE_PATH`:
- `app.zennly.io` — base unset, serves at the root. Staff.
- behind `zennly.io/book/*` — base `/book/`, so its assets resolve under the prefix rather than
  colliding with the marketplace at the root. Customers.

Local dev mirrors this: `:4028` at the root, `:4029` with the prefix, marketplace proxying to
`:4029` (`BOOKING_ENGINE_PROXY_TARGET`) while mirrored marketing links point at `:4028`
(`NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN`). The two vars answer different questions — "what does
/book/* forward to" versus "where does the engine actually live" — and now genuinely differ.

**Rejected alternatives, and why:**
- *Customer booking at `app.zennly.io`* (no proxy): simplest to run, but the customer visibly
  changes site mid-booking.
- *Both URLs serving customers*: the same booking page at two addresses. Duplicate content for
  search engines, split analytics, and businesses wouldn't know which link to share. You would
  end up picking a canonical one anyway.

**Owed by the deployment phase:** the `app.zennly.io/<orgSlug>` → `zennly.io/book/<orgSlug>`
redirect. Businesses have already shared those links — printed cards, Instagram bios, Google
listings — so this is not optional cleanup.
