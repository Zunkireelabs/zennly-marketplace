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

function rewriteUrl(url) {
  if (!url) return url;
  if (url === PREFIX || url.startsWith(`${PREFIX}/`)) return url; // already prefixed (idempotent re-runs)
  if (/^(#|mailto:|tel:|data:)/i.test(url)) return url;
  if (url.startsWith("//")) return url; // protocol-relative external

  const zennlyAbsolute = url.match(/^(https?:\/\/zennly\.io)(\/.*)?$/i);
  if (zennlyAbsolute) {
    const [, origin, rest] = zennlyAbsolute;
    const relative = rest || "/";
    if (relative === PREFIX || relative.startsWith(`${PREFIX}/`)) return `${origin}${relative}`;
    return `${origin}${PREFIX}${relative}`;
  }

  if (/^https?:\/\//i.test(url)) return url; // other external domains, untouched
  if (isRootAbsolute(url)) return `${PREFIX}${url}`;
  return url; // relative paths, anchors already handled above
}

function rewriteHtml(html) {
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
