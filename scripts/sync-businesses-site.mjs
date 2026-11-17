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
//   WEB_ZENLY_DIR — path to the web-zenly checkout (default: ../web-zenly)

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const WEB_ZENLY_DIR = process.env.WEB_ZENLY_DIR
  ? path.resolve(REPO_ROOT, process.env.WEB_ZENLY_DIR)
  : path.resolve(REPO_ROOT, "..", "web-zenly");
const SITE_DIR = path.join(WEB_ZENLY_DIR, "_site");
const DEST_DIR = path.join(REPO_ROOT, "public", "businesses");
const PREFIX = "/businesses";

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

  console.log(`Mirrored web-zenly -> ${path.relative(REPO_ROOT, DEST_DIR)} (${rewritten} files rewritten).`);
}

const skipBuild = process.argv.includes("--skip-build");
const ifMissing = process.argv.includes("--if-missing");

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

if (!skipBuild) buildWebZenly();
copyAndRewrite();
