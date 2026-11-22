#!/usr/bin/env node
// Mirrors web-zenly's built static site into public/businesses/, rewriting
// root-absolute references so the mirrored pages work under the /businesses
// prefix. web-zenly (../web-zenly) is treated as strictly read-only — this
// script only ever reads its build output (_site/) and never writes into
// that repo. Re-run this whenever web-zenly's content/design changes.
//
// The contract is "ensure a fresh mirror exists", not "always rebuild the source".
// When the web-zenly source is unavailable but public/businesses/ is already
// populated, this exits 0 with a notice — that is the CI/Docker case, where the
// mirror is staged into the build context before the image build. It only fails
// when neither the source nor an existing mirror is present.
//
// Usage:
//   node scripts/sync-businesses-site.mjs              # builds web-zenly, then mirrors
//   node scripts/sync-businesses-site.mjs --skip-build # mirrors an already-built _site/
//   node scripts/sync-businesses-site.mjs --if-missing  # no-op when the mirror exists
//
// Env:
//   WEB_ZENLY_DIR — path to the marketing source (default: ./marketing, this repo's workspace;
//                   falls back to ../web-zenly only if there is no in-repo copy)

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// This runs from predev/prebuild as a bare node process, so unlike the app it gets no .env
// loading for free — WEB_ZENLY_DIR set there was silently ignored, and the sync fell back to
// the sibling checkout without saying so. Load it explicitly; a real shell variable still wins.
loadEnv({ path: path.join(REPO_ROOT, ".env"), override: false });

// The marketing site's source now lives IN this repo, as the `marketing` npm workspace — it was
// absorbed from the separate Zunkireelabs/web-zenly repo so that repo could be retired without
// losing the only copy of the templates. `../web-zenly` is kept only as a fallback for a checkout
// that still has the old sibling and no in-repo copy; WEB_ZENLY_DIR still overrides both.
const IN_REPO_MARKETING_DIR = path.resolve(REPO_ROOT, "marketing");
const WEB_ZENLY_DIR = process.env.WEB_ZENLY_DIR
  ? path.resolve(REPO_ROOT, process.env.WEB_ZENLY_DIR)
  : existsSync(path.join(IN_REPO_MARKETING_DIR, ".eleventy.js"))
    ? IN_REPO_MARKETING_DIR
    : path.resolve(REPO_ROOT, "..", "web-zenly");
const SITE_DIR = path.join(WEB_ZENLY_DIR, "_site");
const DEST_DIR = path.join(REPO_ROOT, "public", "businesses");
const PREFIX = "/businesses";

// web-zenly's own "Login" buttons (and the one hardcoded book-now link) point at
// https://app.zennly.io/... absolute, 220 instances across the mirror. That is the CORRECT
// production URL — book-spa genuinely lives at app.zennly.io — so it must survive a production
// build byte-for-byte. It's only wrong on localhost, where the real engine is NEXT_PUBLIC_
// BOOKING_ENGINE_ORIGIN (e.g. http://localhost:4028), not BOOKING_ENGINE_PROXY_TARGET: the two
// share a value today only by coincidence of local dev. BOOKING_ENGINE_PROXY_TARGET answers "what
// does /book/* forward to" (a same-origin proxy path, src/app/api's sibling next.config rewrite);
// ENGINE_ORIGIN answers "where does the engine actually live" (a direct, unproxied origin) — and
// staff login (this rewrite's whole purpose) is never proxied, so it needs the direct origin, not
// a /book/-prefixed path. providers-data.ts already reads NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN for
// exactly this "where is the real engine" question; reusing it here keeps one answer to that
// question instead of two.
//
// Safety: a production build has no override set at all (.env is gitignored and never committed;
// .env.example ships this commented out), so ENGINE_REWRITE_ACTIVE is false there and every
// app.zennly.io URL in rewriteUrl() below falls through completely untouched — same code path as
// if this feature didn't exist. The only way app.zennly.io URLs change in a build is if whoever
// runs that build explicitly sets NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN to something other than
// https://app.zennly.io in that build's own environment — the same condition under which the booking
// drawer's own "Book now" link already points elsewhere (providers-data.ts), so this rewrite adds
// no new failure mode beyond one that already exists and is already load-bearing.
const PRODUCTION_ENGINE_ORIGIN = "https://app.zennly.io";
const rawEngineOverride = (process.env.NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN || "").trim().replace(/\/+$/, "");
const ENGINE_REWRITE_ACTIVE =
  rawEngineOverride.length > 0 && rawEngineOverride.toLowerCase() !== PRODUCTION_ENGINE_ORIGIN.toLowerCase();
const ENGINE_ORIGIN_OVERRIDE = ENGINE_REWRITE_ACTIVE ? rawEngineOverride : null;

// web-zenly generates these at the _site root as ITS OWN canonical SEO
// surface (absolute https://zennly.io/... URLs throughout). Once zennly.io's
// root is served by this Next app, these must not be copied in verbatim —
// they'd either collide with this app's own /sitemap.xml etc. or publish
// confusing /businesses-prefixed canonical URLs. Left out deliberately;
// a combined sitemap/robots story is a separate, later decision.
const EXCLUDED_ROOT_FILES = new Set([
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "llms-full.txt",
  "feed.xml", // RSS/Atom feed, same absolute-URL-canonical-surface category as the above
]);

const REWRITE_EXTENSIONS = new Set([".html", ".css"]);

function buildWebZenly() {
  if (!existsSync(WEB_ZENLY_DIR)) {
    throw new Error(`web-zenly repo not found at ${WEB_ZENLY_DIR}`);
  }
  console.log(`Building web-zenly (${WEB_ZENLY_DIR})...`);
  execSync("npm run build", { cwd: WEB_ZENLY_DIR, stdio: "inherit" });
}

function isRootAbsolute(url) {
  return url.startsWith("/") && !url.startsWith("//");
}

// web-zenly's Eleventy output is all trailing-slash URLs (its old nginx served them via
// `try_files $uri $uri/`). Next defaults to trailingSlash:false and normalizes the slash away
// via a 308 BEFORE proxy.ts ever runs — so a mirrored page that still declares its own
// canonical/og:url/sitemap <loc> WITH the trailing slash is asserting its own URL is a
// redirect, not a destination. Google's guidance is that canonical and sitemap entries must be
// the final, non-redirecting URL. Strips a single trailing "/" from the path portion only
// (never from the bare "/businesses" root collapsing to "", and never touching a query string
// or #fragment after it) so every rewritten URL matches what the server actually serves 200
// for. trailingSlash:true in next.config was considered and rejected — it would also slash
// every marketplace route (/search -> /search/), a problem that only exists in this mirror.
function stripTrailingSlash(value) {
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  let pathPart = match[1];
  const suffix = match[2] ?? "";
  if (pathPart.length > 1 && pathPart.endsWith("/")) pathPart = pathPart.slice(0, -1);
  return pathPart + suffix;
}

function rewriteUrl(url) {
  if (!url) return url;
  if (url === PREFIX || url.startsWith(`${PREFIX}/`)) return stripTrailingSlash(url); // already prefixed (idempotent re-runs)
  if (/^(#|mailto:|tel:|data:)/i.test(url)) return url;
  if (url.startsWith("//")) return url; // protocol-relative external

  const zennlyAbsolute = url.match(/^(https?:\/\/zennly\.io)(\/.*)?$/i);
  if (zennlyAbsolute) {
    const [, origin, rest] = zennlyAbsolute;
    const relative = rest || "/";
    const prefixedRelative =
      relative === PREFIX || relative.startsWith(`${PREFIX}/`) ? relative : `${PREFIX}${relative}`;
    return `${origin}${stripTrailingSlash(prefixedRelative)}`;
  }

  // Only rewritten when NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN points somewhere other than production
  // (see ENGINE_REWRITE_ACTIVE above) — origin only, path preserved verbatim, so
  // https://app.zennly.io/nuad-thai-spa/book becomes e.g. http://localhost:4028/nuad-thai-spa/book.
  // Naturally idempotent: once rewritten, the URL no longer matches app.zennly.io, so a re-run's
  // rewriteUrl() falls through to the generic "other external domain, untouched" case below.
  const engineAbsolute = url.match(/^https?:\/\/app\.zennly\.io(\/.*)?$/i);
  if (engineAbsolute) {
    if (!ENGINE_REWRITE_ACTIVE) return url;
    return `${ENGINE_ORIGIN_OVERRIDE}${engineAbsolute[1] || ""}`;
  }

  if (/^https?:\/\//i.test(url)) return url; // other external domains, untouched
  if (isRootAbsolute(url)) return stripTrailingSlash(`${PREFIX}${url}`);
  return url; // relative paths, anchors already handled above
}

function looksLikeUrl(value) {
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

// JSON-LD node identifiers (`@id`) that are pure fragments against the site origin, e.g.
// "https://zennly.io/#organization", name a site-wide schema node (Organization, WebSite,
// SoftwareApplication) — not a fetchable page, and not one that moved to /businesses.
// Rewriting it would be harmless (doc: integrate-zennly-phase-3.md §1) but semantically wrong:
// deliberately left unrewritten. An @id that already carries a real path before its fragment
// (e.g. "https://zennly.io/blog/spreadsheets-stop-working/", or
// "https://zennly.io/glossary/#termset") identifies a node that DID move — e.g. a WebPage or
// BreadcrumbList item for a specific relocated page — so those are rewritten normally; only the
// pure-origin-fragment case is exempted.
function isPureOriginFragment(value) {
  return /^https?:\/\/zennly\.io\/(#.*)?$/i.test(value);
}

function rewriteJsonLdValue(key, value) {
  if (typeof value === "string") {
    if (key === "@id" && isPureOriginFragment(value)) return value;
    return rewriteUrl(value);
  }
  if (Array.isArray(value)) return value.map((entry) => rewriteJsonLdNode(entry));
  if (value && typeof value === "object") return rewriteJsonLdNode(value);
  return value;
}

function rewriteJsonLdNode(node) {
  if (Array.isArray(node)) return node.map((entry) => rewriteJsonLdNode(entry));
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = rewriteJsonLdValue(key, value);
  }
  return out;
}

// Parses each JSON-LD block as JSON and rewrites URL-bearing fields (url, item, logo, image,
// mainEntityOfPage, ...) directly on the parsed structure. A regex over the raw JSON text was
// considered and rejected: the fields that need rewriting vary by schema type, and a regex
// risks both missing some and corrupting escaping inside string values. If a block fails to
// parse, it's left untouched (and logged) rather than silently dropped or corrupted.
function rewriteJsonLdScripts(html) {
  return html.replace(
    /(<script[^>]+type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, openTag, body, closeTag) => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (err) {
        console.warn(`  warn  JSON-LD block failed to parse (left untouched): ${err.message}`);
        return match;
      }
      const rewritten = rewriteJsonLdNode(parsed);
      return `${openTag}\n${JSON.stringify(rewritten, null, 2)}\n${closeTag}`;
    }
  );
}

// <meta content="..."> carries URLs (og:image, og:url, twitter:image) AND plain text
// (description, og:title) in the same attribute. Only rewrite values that look like a URL —
// root-absolute or http(s) — so text content is never touched.
function rewriteMetaTags(html) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) =>
    tag.replace(/(\scontent=)(["'])([^"']*)\2/i, (m, prefix, quote, value) => {
      if (!looksLikeUrl(value)) return m;
      return `${prefix}${quote}${rewriteUrl(value)}${quote}`;
    })
  );
}

function rewriteHtml(html) {
  // JSON-LD first: its string values ("url": "https://...") don't match the attribute-style
  // regexes below, but doing this first keeps all URL-rewriting logic for a block together.
  html = rewriteJsonLdScripts(html);

  html = rewriteMetaTags(html);

  // href="...", src="...", action="..."
  html = html.replace(/(href|src|action)(=["'])([^"']*)(["'])/gi, (_m, attr, open, value, close) => {
    return `${attr}${open}${rewriteUrl(value)}${close}`;
  });

  // srcset="url desc, url desc, ..."
  html = html.replace(/srcset(=["'])([^"']*)(["'])/gi, (_m, open, value, close) => {
    const rewritten = value
      .split(",")
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return trimmed;
        const [url, ...descriptor] = trimmed.split(/\s+/);
        return [rewriteUrl(url), ...descriptor].join(" ");
      })
      .join(", ");
    return `srcset${open}${rewritten}${close}`;
  });

  // Inline <style> CSS url(...)
  html = html.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_m, quote, value) => `url(${quote}${rewriteUrl(value)}${quote})`);

  // Inline <script> JS navigation: window.location(.href) = '/path'
  html = html.replace(
    /(window\.location(?:\.href)?\s*=\s*)(['"])(\/[^'"]*)\2/g,
    (_m, prefix, quote, value) => `${prefix}${quote}${rewriteUrl(value)}${quote}`
  );

  html = pointWordmarksAtMarketplace(html);

  return html;
}

// The two links the /businesses prefix must NOT be applied to: the Zennly wordmarks, in the
// header and in the footer.
//
// web-zenly writes both as href="/", meaning "the site you're on", and the generic rewrite above
// dutifully turns that into /businesses — correct for every other root-absolute link in the
// mirror, wrong for these. Now that both surfaces live on zennly.io, the wordmark is the shared
// brand mark across them, and a customer who lands on a marketing page and clicks it expects the
// marketplace, not a reload of the page they are already on. Both wordmarks are the same mark
// and carry the same promise, so they go to the same place — the footer one even says so in its
// aria-label ("Zennly home").
//
// Applied after the generic pass rather than special-cased inside rewriteUrl(), because
// rewriteUrl() sees a bare URL with no idea which element it came from — "/" appears in plenty
// of places that should still be prefixed. Matching the anchor is the only way to tell them
// apart. The markup is fixed Eleventy includes (_nav-v2.njk, _footer-v2.njk), so the classes are
// stable; the href is matched loosely (before or after the class, either prefixed or not) so
// this survives attribute reordering and re-running the sync over an already-rewritten mirror.
//
// Note this is the ONLY route back to the marketing home from a marketing page's chrome, since
// the nav's own links all point at sections rather than at "/". That is fine — the nav sections
// are what people navigate by — but if a "Home" item is ever wanted there, it needs an explicit
// /businesses href in web-zenly, not a bare "/".
const WORDMARK_CLASSES = ["v2-nav__logo", "v2-footer-logo"];

function pointWordmarksAtMarketplace(html) {
  for (const className of WORDMARK_CLASSES) {
    const anchor = new RegExp(`<a\\b[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, "gi");
    html = html.replace(anchor, (tag) => tag.replace(/\bhref=(["'])[^"']*\1/i, 'href="/"'));
  }
  return html;
}

function rewriteCss(css) {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_m, quote, value) => `url(${quote}${rewriteUrl(value)}${quote})`);
}

function walk(dir, fileCb) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fileCb);
    else fileCb(full);
  }
}

function copyAndRewrite() {
  if (!existsSync(SITE_DIR)) {
    throw new Error(`web-zenly build output not found at ${SITE_DIR}. Build it first (npm run build in web-zenly) or omit --skip-build.`);
  }

  rmSync(DEST_DIR, { recursive: true, force: true });
  mkdirSync(DEST_DIR, { recursive: true });

  for (const entry of readdirSync(SITE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() && EXCLUDED_ROOT_FILES.has(entry.name)) {
      console.log(`  skip  ${entry.name} (web-zenly's own SEO file — not mirrored)`);
      continue;
    }
    cpSync(path.join(SITE_DIR, entry.name), path.join(DEST_DIR, entry.name), { recursive: true });
  }

  let rewritten = 0;
  walk(DEST_DIR, (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!REWRITE_EXTENSIONS.has(ext)) return;
    const original = readFileSync(file, "utf8");
    const updated = ext === ".css" ? rewriteCss(original) : rewriteHtml(original);
    if (updated !== original) {
      writeFileSync(file, updated, "utf8");
      rewritten++;
    }
  });

  const engineNote = ENGINE_REWRITE_ACTIVE
    ? `app.zennly.io links rewritten to ${ENGINE_ORIGIN_OVERRIDE}.`
    : `app.zennly.io links left untouched.`;
  console.log(`Mirrored web-zenly -> ${path.relative(REPO_ROOT, DEST_DIR)} (${rewritten} files rewritten). ${engineNote}`);
}

const skipBuild = process.argv.includes("--skip-build");
const ifMissing = process.argv.includes("--if-missing");
const allowDevOrigin = process.argv.includes("--allow-dev-origin");

function mirrorIsPopulated() {
  return existsSync(DEST_DIR) && readdirSync(DEST_DIR).length > 0;
}

/**
 * What this run needs from web-zenly: the whole checkout when it is going to build,
 * just the existing build output when --skip-build says someone else already did.
 */
function sourceIsAvailable() {
  return skipBuild ? existsSync(SITE_DIR) : existsSync(WEB_ZENLY_DIR);
}

if (ifMissing && mirrorIsPopulated()) {
  console.log(`public/businesses already populated, skipping (--if-missing). Run \`npm run sync:businesses\` to refresh.`);
  process.exit(0);
}

if (!sourceIsAvailable()) {
  const missing = skipBuild ? SITE_DIR : WEB_ZENLY_DIR;
  if (mirrorIsPopulated()) {
    // The CI/Docker case: the build context carries the mirror, not the source repo.
    console.log(`web-zenly source not found at ${missing}.`);
    console.log(`public/businesses is already populated, so using the existing mirror as-is.`);
    console.log(`(Set WEB_ZENLY_DIR to point at a web-zenly checkout if you meant to regenerate it.)`);
    process.exit(0);
  }
  throw new Error(
    `web-zenly source not found at ${missing} and public/businesses is empty, so there is ` +
      `nothing to serve under /businesses. Clone web-zenly as a sibling of this repo, set ` +
      `WEB_ZENLY_DIR to its path, or stage a prebuilt public/businesses/ into the build context.`
  );
}

// public/businesses/ is a COMMITTED build artifact, so whoever runs this sync bakes their own
// environment into the published site. On 2026-11-22 that happened: a mirror generated with
// NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN=http://192.168.1.68:4028 was committed and deployed, putting
// 221 copies of a private LAN address across all 110 pages — every "Login" button on the live
// marketing site pointed at someone's laptop, and zero app.zennly.io URLs survived.
//
// The rewrite's original safety note reasoned only about production BUILDS having no override
// set, which is true and beside the point: the danger is a LOCAL run whose output gets committed.
// So refuse by default and make the dev case explicit. `predev` opts in because a mirror built
// to look at on localhost is legitimately dev-flavoured; the bare `npm run sync:businesses` —
// the command someone runs before committing a refresh — is the one that must not do this
// silently.
if (ENGINE_REWRITE_ACTIVE && !allowDevOrigin) {
  throw new Error(
    `Refusing to write the mirror: NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN is "${ENGINE_ORIGIN_OVERRIDE}", ` +
      `so every https://app.zennly.io link (including staff "Login") would be rewritten to that ` +
      `origin and baked into public/businesses/ — which is committed and deployed.\n` +
      `  To refresh the mirror for COMMITTING: unset NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN for this ` +
      `run, e.g. \`NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN= npm run sync:businesses\`.\n` +
      `  To build a dev-only mirror you will NOT commit: pass --allow-dev-origin.`
  );
}

if (!skipBuild) buildWebZenly();
copyAndRewrite();
