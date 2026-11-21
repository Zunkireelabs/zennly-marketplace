# integrate-zennly — Phase 3: finish the combination correctly

## Context

`zennly-marketplace` serves the root of `zennly.io`; `web-zenly`'s Eleventy marketing site is
mirrored under `/businesses` by `scripts/sync-businesses-site.mjs`. `../web-zenly` is read-only.
Phase 1 (`fb18d4b`) built the mirror; phase 2 (`ae0467f`) made it CI-safe, bypassed the Supabase
auth round-trip on static assets, fixed the 404 to be a real 404, and added the eleven redirect
prefixes covering the 34 relocating marketing URLs.

Phase 3 closes the one defect class phase 2 missed and finishes the SEO surface. Deployment
(Dockerfile, CI, Traefik cutover) is still deliberately out of scope.

---

## 1. The rewriter misses page metadata — BLOCKER, affects all 36 pages

`rewriteHtml()` in `scripts/sync-businesses-site.mjs` rewrites `href`, `src`, `action`, `srcset`,
inline `url()`, and `window.location` assignments. It does **not** touch `<meta content="...">`
or JSON-LD `<script type="application/ld+json">` bodies, both of which carry absolute
`https://zennly.io/...` URLs throughout web-zenly's output.

Verified on the current mirror — all 36 HTML pages are affected:

```
<link rel="canonical" href="https://zennly.io/businesses/pricing/">   ← correct (href, rewritten)
<meta property="og:url" content="https://zennly.io/pricing/">          ← stale (content=, missed)
<meta property="og:image" content="https://zennly.io/assets/images/og-default.jpg">  ← 404s
"item": "https://zennly.io/pricing/"                                   ← stale (JSON-LD)
"url":  "https://zennly.io/assets/images/logo.png"                     ← 404s
```

Two distinct consequences:

**Social preview images are broken.** `og:image` and the JSON-LD organization `logo` both point
at `/assets/...`, which is *not* one of the eleven redirect prefixes. Confirmed against the
running dev server: the old path returns 404, the `/businesses/`-prefixed path returns 200. Every
link shared to Slack, LinkedIn, Facebook, or iMessage renders with no image.

**Conflicting canonicalization signals.** The canonical tag says `/businesses/pricing/` while
`og:url` and the JSON-LD `BreadcrumbList` say `/pricing/`. Search engines get told two different
things about the same page, on a site with a sitemap, an `llms.txt`, and a glossary page family —
i.e. one where this demonstrably matters.

Fix in the sync script, not by hand-patching output — the mirror is regenerated on every build.
Extend `rewriteHtml()` to cover:

- `<meta ... content="...">` where the content is a URL. Be careful: `content` is also used for
  plain text (`description`, `og:title`). Only rewrite values that are root-absolute paths or
  `https://zennly.io/...` URLs — `rewriteUrl()` already returns non-URL input unchanged, but
  gate on the attribute actually looking like a URL rather than relying on that.
- JSON-LD blocks: parse each `<script type="application/ld+json">` body as JSON, walk it, and
  rewrite string values that are root-absolute or `zennly.io`-absolute URLs. Parsing beats
  regexing the JSON — the fields in play (`url`, `@id`, `item`, `logo`, `mainEntityOfPage`,
  `image`) vary by schema type and a regex over a JSON blob will either miss some or corrupt
  escaping. If a block fails to parse, leave it untouched and log it rather than dropping it.

`rewriteUrl()` is already idempotent, so re-running the sync over an existing mirror stays safe.

Note the `@id` values that are pure fragments against the origin (`https://zennly.io/#organization`)
are schema node identifiers, not fetchable URLs. Rewriting them is harmless but unnecessary;
decide deliberately and say which you chose in the commit message.

## 2. Redirect the old asset paths

Independent of the metadata fix: `https://zennly.io/assets/*` URLs exist in the wild — in
already-indexed pages, in previously-shared social cards, in anything that cached the old HTML.
After cutover they 404, because `assets` isn't in `MOVED_MARKETING_PREFIXES`.

Add `/assets/:path*` → `/businesses/assets/:path*`. Check first that the marketplace has no
`/assets` route of its own and isn't likely to want one (it currently uses `public/` directly and
`/images`, `/videos`); if there is any chance of a future collision, say so rather than silently
claiming the prefix.

## 3. Unified sitemap / robots / llms

`sync-businesses-site.mjs:38` deliberately excludes `sitemap.xml`, `robots.txt`, `llms.txt`, and
`llms-full.txt` from the mirror, because they carry web-zenly's own absolute canonical URLs and
would collide with this app's root-level equivalents. That exclusion was right. The consequence is
that **the combined site currently publishes no sitemap and no robots.txt at all.**

Build one canonical set at the root, served by this app, covering both surfaces:

- the marketplace's own routes (`/`, `/search`, `/collections/*`, `/providers/*` — the dynamic
  ones enumerate from the database, so generate rather than hardcode), and
- all 35 mirrored marketing URLs under their `/businesses/` paths.

Prefer Next route handlers (`app/sitemap.ts`, `app/robots.ts`) over a build step so the
marketplace half stays accurate as providers are added. For the marketing half, read the mirrored
`public/businesses/` tree rather than hardcoding a list, so a new web-zenly page appears without
anyone editing this repo.

`llms.txt`/`llms-full.txt` are a judgement call: either regenerate a combined version or drop them
for now. Say which you chose and why — don't leave it implicit.

---

## Verification

Evidence, not assertions. Re-run the sync from scratch first (`npm run sync:businesses`) so you
are testing regenerated output, not hand-edited files.

- Across all 36 mirrored pages: **zero** occurrences of `https://zennly.io/` followed by anything
  other than `businesses/`. Script it; grep the whole tree, not a sample.
- `og:image` and the JSON-LD logo URL both resolve 200 on the running server.
- On any given page, `canonical`, `og:url`, and the JSON-LD `mainEntityOfPage`/breadcrumb terminal
  item all agree on the same URL.
- Each JSON-LD block still parses as valid JSON after rewriting. Validate every block on every
  page, not one example.
- `/assets/images/og-default.jpg` 308s to the `/businesses/` path and that target 200s.
- The phase-2 guarantees still hold — re-run its checks: all 34 sitemap URLs redirect in both
  trailing-slash shapes and their targets 200; the three-way sync test (source present / source
  absent with mirror / neither) behaves as documented; marketplace routes unaffected.
- `/sitemap.xml` and `/robots.txt` return 200 at the root, the sitemap parses as valid XML, and
  every URL it lists resolves 200.
- Run against **both** `next dev` and `next start` — the proxy's `node:fs` usage behaves
  differently enough between them to be worth confirming each time.
