# integrate-zennly — Phase 2: making it shippable

## Context

Three repos consolidate onto one domain. `book-spa` stays on `app.zennly.io`, untouched.
`zennly-marketplace` (this repo) becomes the root app at `zennly.io`. `web-zenly`'s Eleventy
marketing site gets mounted at `zennly.io/businesses`, mirrored from its build output —
`web-zenly` itself stays strictly read-only.

**Phase 1 is done and committed** (`fb18d4b`, branch `integrate-zennly`, not pushed):
`scripts/sync-businesses-site.mjs` builds web-zenly and mirrors `_site/` into
`public/businesses/` with every root-absolute reference rewritten to the `/businesses` prefix;
`src/proxy.ts` resolves extension-less `/businesses/*` requests to Eleventy's `index.html`
output shape; the 80MB mirror is gitignored and regenerated via `predev`/`prebuild` hooks.
Verified locally — all mirrored routes 200, zero un-prefixed refs left across 142 files.

Phase 2 is everything standing between that and a live deploy. Four of these are blockers,
and two of them (the SEO redirects and the Traefik cutover) have to land in the *same* release
as the domain switch or the site breaks for real users and search engines.

---

## 1. Make the sync script CI-safe — BLOCKER, do first

`package.json:8` wires `prebuild` → `sync-businesses-site.mjs` with no flags → `buildWebZenly()`
→ `scripts/sync-businesses-site.mjs:48` throws when `../web-zenly` is missing. A Docker build
context contains only this repo, so **`npm run build` dies before `next build` ever runs**.
Nothing else in this phase can be tested until this is fixed.

Fix: make the script's contract "ensure a fresh mirror exists", not "always rebuild the source".
When `../web-zenly` is absent **but** `public/businesses/` is already populated, log a clear
notice and exit 0 instead of throwing — that is precisely the CI/Docker case, where the mirror
is staged into the context before the image build. Keep throwing when neither exists; that's a
genuine misconfiguration.

Also add an env override (`WEB_ZENLY_DIR`) so the sibling-path assumption isn't the only way to
point at the source, and a named `npm run sync:businesses` script (see item 3).

Do **not** solve this by having the Dockerfile call `next build` directly to dodge `prebuild` —
that hides the coupling and breaks the next person who runs `npm run build`.

## 2. Short-circuit the proxy for mirrored static assets

`src/proxy.ts:56`'s matcher excludes `svg|png|jpg|jpeg|gif|webp|mp4` but **not** `.css`, `.js`,
`.woff2`, `.ico`. So `/businesses/assets/css/tailwind.css` enters the proxy,
`rewriteBusinessesPath` returns `null` at line 21 (it has an extension), and execution falls
through to `await supabase.auth.getUser()` at line 51 — a network round-trip to Supabase auth
per static asset.

web-zenly's `base.njk` pulls tailwind.css plus five vendor scripts (alpine, gsap, ScrollTrigger,
SplitText, lenis) plus main.js, so that's 7+ needless auth calls on every marketing page load.

Fix: in `rewriteBusinessesPath`, return `NextResponse.next()` rather than `null` for extensioned
paths under `/businesses`, so they bypass the Supabase block entirely.

## 3. Named sync script + stale-mirror DX

`predev` uses `--if-missing`, so once `public/businesses/` exists it never refreshes. Someone
edits web-zenly, restarts the dev server, sees no change, and has no obvious lever — there is no
named script, only the raw `node scripts/...` invocation.

Add `"sync:businesses": "node scripts/sync-businesses-site.mjs"` to `package.json` scripts and
mention it in the repo's README/CLAUDE.md alongside the gitignore note.

## 4. Mirrored 404 is unreachable

`public/businesses/404.html` copies in fine, but `/businesses/nope` rewrites to
`/businesses/nope/index.html`, misses, and Next serves the marketplace's `not-found.tsx` —
marketplace chrome in the middle of the marketing section.

Decide one way and make it deliberate: either have the proxy fall back to
`/businesses/404.html` when the target `index.html` doesn't exist, or accept the unified
marketplace 404 and stop mirroring `404.html`. Low stakes; pick one and note it.

## 5. 301 redirects for the 34 marketing URLs that move — BLOCKER, ships with the cutover

Today `zennly.io/pricing` is live and indexed. After the cutover the root serves the marketplace
and that URL becomes `zennly.io/businesses/pricing`. **Every existing marketing URL moves.**
web-zenly's sitemap lists 35 entries; 34 of them relocate (the 35th is `/`, which stays but
changes meaning). The site is visibly SEO-invested — sitemap, `llms.txt`, a glossary page family —
so shipping the domain switch without redirects would 404 the entire indexed marketing surface.

Good news: **zero path collisions.** Marketplace owns `api`, `auth`, `collections`, `providers`,
`saved`, `search`; web-zenly owns `about`, `blog`, `case-study`, `demo`, `features`, `glossary`,
`how-it-works`, `pricing`, `privacy-policy`, `solutions`, `terms-of-service`. Disjoint sets, so a
clean prefix mapping works.

Add permanent redirects in `next.config.ts` — eleven prefix rules cover all 34 URLs:

```
/about/:path*            →  /businesses/about/:path*
/blog/:path*             →  /businesses/blog/:path*
/case-study/:path*       →  /businesses/case-study/:path*
/demo/:path*             →  /businesses/demo/:path*
/features/:path*         →  /businesses/features/:path*
/glossary/:path*         →  /businesses/glossary/:path*
/how-it-works/:path*     →  /businesses/how-it-works/:path*
/pricing/:path*          →  /businesses/pricing/:path*
/privacy-policy/:path*   →  /businesses/privacy-policy/:path*
/solutions/:path*        →  /businesses/solutions/:path*
/terms-of-service/:path* →  /businesses/terms-of-service/:path*
```

Handle both trailing-slash shapes — the sitemap publishes `/pricing/` while web-zenly's own nav
links to `/pricing`, so both are in the wild and both must redirect.

## 6. Unified sitemap / robots / llms — BLOCKER for SEO, ships with the cutover

Phase 1 deliberately excluded `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` from the
mirror (`sync-businesses-site.mjs:38`) because they carry web-zenly's own absolute `zennly.io`
canonical URLs and would either collide with this app's root-level equivalents or publish
confusing `/businesses`-prefixed canonicals. That punt was correct, but it is now due.

The merged domain needs **one** canonical set at the root, covering both the marketplace's own
routes and the `/businesses/*` marketing pages. Generate them from this app (Next route handlers
or a build step) rather than mirroring web-zenly's. Note that the mirrored marketing HTML also
carries its own `<link rel="canonical">` tags pointing at the old un-prefixed URLs — audit those
during this item; the sync script's rewrite covers `href`/`src`/`action`/`srcset`/`url()` but
canonical tags pointing at `https://zennly.io/pricing/` will have been rewritten to
`https://zennly.io/businesses/pricing/`, which is correct, so verify rather than assume.

## 7. Dockerfile + CI — BLOCKER

This repo has **no** Docker or GitHub Actions scaffolding at all. Bootstrap it with the
`ci-cd-deployment` skill's **webapp** archetype (Next.js standalone, multi-stage, built in CI and
pushed to GHCR; the VPS only pulls). Substitutions: `PROJECT_NAME=zennly-marketplace`,
`PROD_DOMAIN=zennly.io`, `NODE_VERSION=22` (Next 16 + React 19).

The non-standard part is staging web-zenly's build output into the Docker context:

1. Check out **both** repos as siblings under `$GITHUB_WORKSPACE` — `actions/checkout`'s `path:`
   cannot escape the workspace, so place them as `zennly-marketplace/` and `web-zenly/` so the
   script's existing `../web-zenly` resolution holds unchanged.
2. `npm ci && npm run build` in `web-zenly/` → produces `_site/`.
3. `node scripts/sync-businesses-site.mjs --skip-build` in `zennly-marketplace/` → populates
   `public/businesses/`.
4. `docker build` — the Dockerfile copies `public/` in, and `prebuild` no-ops because the mirror
   is already present (that's item 1's fix doing its job).

Two operational details that will bite otherwise:

- **Cross-repo checkout auth.** `GITHUB_TOKEN` is scoped to the current repo only. Checking out
  `web-zenly` needs a PAT or deploy key added as a secret.
- **Branch pairing.** Decide and encode which web-zenly ref each marketplace branch mirrors.
  Recommended: marketplace `stage` → web-zenly `stage`, marketplace `main` → web-zenly `main`,
  matching the org's existing convention.

## 8. Traefik cutover + retiring web-zenly's container — BLOCKER, highest-risk step

`zennly.io` is currently served by the `web-zenly-web-prod` container, whose compose file also
owns two pieces of routing that are easy to lose:

- the `www.zennly.io` → apex 301 redirect middleware, and
- a priority-1000 router redirecting the legacy host `zenly.zunkireelabs.com` → `zennly.io`.

Both must be **ported into this repo's `docker-compose.yml`** before the switch, or the www host
and the legacy domain break.

Two routers both claiming ``Host(`zennly.io`)`` would resolve by priority rather than intent, so
sequence the cutover deliberately: bring the marketplace container up with the `zennly.io` rule,
confirm it answers, then stop and remove `web-zenly-web-prod`. Keep the old container's image
around long enough to roll back to.

`book-spa` on `app.zennly.io` is unaffected throughout.

---

## Open decisions — need the user, not the implementer

- **Marketing edits now require a marketplace deploy.** Today a web-zenly push deploys itself.
  After this, marketing content only reaches zennly.io when zennly-marketplace rebuilds. The
  clean fix is a `repository_dispatch` from web-zenly to trigger a marketplace rebuild — but
  that edits web-zenly's workflows, which the current constraint forbids. Needs an explicit call.
- **Does web-zenly keep deploying to its own staging host?** Its `dev-web.zenly.zunkireelabs.com`
  staging deploy is independent of all this and can stay, but confirm it isn't expected to die.
- **Item 4's 404 behavior** — mirrored marketing 404 vs unified marketplace 404.

## Verification

Order matters; items 1–4 are testable locally, 5–8 need the staging environment.

- `rm -rf public/businesses && npm run build` with `../web-zenly` present → mirror regenerates,
  `next build` completes.
- Temporarily rename `../web-zenly`, with `public/businesses/` populated → `npm run build`
  succeeds with a notice (this is the CI case, item 1).
- Temporarily rename `../web-zenly` with **no** mirror present → fails loudly. Both halves matter.
- `npm run dev`, load `/businesses/pricing`, watch the server log: no Supabase auth call for
  `tailwind.css` or the vendor scripts (item 2).
- `curl -sI localhost:3001/pricing` → 301/308 to `/businesses/pricing`; same for `/pricing/`
  (item 5).
- On staging: every one of the 34 sitemap URLs returns 301 → its `/businesses/*` target, and each
  target returns 200. Script this rather than spot-checking — the whole point is that none are
  missed.
- After cutover: `https://zennly.io/` serves the marketplace, `https://www.zennly.io/` 301s to
  apex, `https://zenly.zunkireelabs.com/` 301s to apex, `https://app.zennly.io/` still serves
  book-spa unchanged.
