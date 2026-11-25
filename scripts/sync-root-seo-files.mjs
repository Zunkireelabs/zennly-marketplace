// Publishes web-zenly's root-level SEO files (llms.txt, llms-full.txt, feed.xml and the
// IndexNow key file) at the root of zennly.io.
//
// Why this exists: the marketing site used to own the root of zennly.io and served these.
// sync-businesses-site.mjs deliberately keeps them OUT of the /businesses mirror (they are
// root-level, absolute-URL files), and nothing else served them, so they 404ed after the move.
//
// The templates still write the old URLs (https://zennly.io/blog/...). Those 308 to
// /businesses/..., so this rewrites them to the final URLs (no trailing slash, matching the
// mirrored canonicals). Root files that really live at the root (llms-full.txt, feed.xml,
// the key file) are left alone.
//
// Usage: npm run sync:root-seo   (needs marketing/_site: `npx eleventy` inside marketing/)
// Output is committed under public/, so deploys need no Eleventy.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_DIR = path.join(ROOT, "marketing", "_site");
const OUT_DIR = path.join(ROOT, "public");
const ORIGIN = "https://zennly.io";

// URLs that stay at the root of the domain.
const ROOT_FILES = new Set(["llms.txt", "llms-full.txt", "feed.xml"]);

function rewriteUrls(text) {
  return text.replace(/https:\/\/zennly\.io(\/[^\s)"'<>\]]*)?/g, (match, rest = "") => {
    const clean = rest.replace(/\/+$/, "");
    const seg = clean.replace(/^\//, "");
    if (ROOT_FILES.has(seg)) return `${ORIGIN}/${seg}`;
    if (seg.startsWith("businesses")) return `${ORIGIN}${clean}`;
    return `${ORIGIN}/businesses${clean}`;
  });
}

if (!existsSync(SITE_DIR)) {
  console.error("marketing/_site not found. Run `npx eleventy` inside marketing/ first.");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

for (const name of ["llms.txt", "llms-full.txt", "feed.xml"]) {
  const src = path.join(SITE_DIR, name);
  if (!existsSync(src)) throw new Error(`${name} missing from marketing/_site`);
  writeFileSync(path.join(OUT_DIR, name), rewriteUrls(readFileSync(src, "utf8")));
  console.log(`wrote public/${name}`);
}

// IndexNow key file: <32 hex chars>.txt whose body is its own name. Must be at the root.
for (const name of readdirSync(SITE_DIR)) {
  if (/^[0-9a-f]{32}\.txt$/.test(name)) {
    copyFileSync(path.join(SITE_DIR, name), path.join(OUT_DIR, name));
    console.log(`copied public/${name}`);
  }
}
