const fs = require("fs");
const path = require("path");
const Image = require("@11ty/eleventy-img");
const { generateHTML } = Image;

// Converts local /assets/images/*.png|jpg screenshots to WebP at their native
// resolution (no downscaling) so visual quality/pixel dimensions are
// unchanged, but file weight drops sharply — this is what was causing slow /
// broken-looking image loads in production. Already-optimized remote URLs
// (e.g. Unsplash links with their own ?w=&q= params) are left untouched.
async function imageShortcode(src, alt, attrs = {}) {
  if (!src) return "";

  const isRemote = /^https?:\/\//.test(src);
  if (isRemote && src.includes("?")) {
    // Already served through an image CDN with its own sizing/quality params.
    const rest = Object.entries(attrs)
      .map(([key, value]) => (value === undefined || value === null ? "" : ` ${key}="${value}"`))
      .join("");
    return `<img src="${src}" alt="${alt || ""}"${rest}>`;
  }

  const inputPath = isRemote ? src : path.join(__dirname, "src", src);

  const metadata = await Image(inputPath, {
    widths: [480, 768, 1024, 1600, null], // responsive srcset; null keeps a native-size fallback
    formats: ["webp"],
    outputDir: "./_site/assets/images/optimized/",
    urlPath: "/assets/images/optimized/",
    sharpWebpOptions: { quality: 90, effort: 6 },
    filenameFormat: (id, filePath, width, format) => {
      const name = path.basename(filePath, path.extname(filePath)).replace(/[^a-z0-9-]/gi, "-");
      return `${name}-${id}-${width}w.${format}`;
    }
  });

  const imageAttributes = Object.assign(
    { alt: alt || "", loading: "lazy", decoding: "async", sizes: "100vw" },
    attrs
  );

  return generateHTML(metadata, imageAttributes);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("readableDate", (iso) => {
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  });


  eleventyConfig.addFilter("letterGroups", (items) => {
    const sorted = [...items].sort((a, b) => a.term.localeCompare(b.term));
    const groups = [];
    for (const it of sorted) {
      const l = it.term[0].toUpperCase();
      let g = groups[groups.length - 1];
      if (!g || g.letter !== l) { g = { letter: l, items: [] }; groups.push(g); }
      g.items.push(it);
    }
    return groups;
  });
  eleventyConfig.addFilter("dateIso", (d) => new Date(d).toISOString().slice(0, 10));

  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

  eleventyConfig.setServerPassthroughCopyBehavior("copy");

  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/10666449c543422a85b0f3a9700e1039.txt");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/videos");
  eleventyConfig.addPassthroughCopy("src/assets/images");

  // Vendored client JS (Alpine, GSAP, Lenis) is copied out of the installed packages rather
  // than committed. These used to be addPassthroughCopy("node_modules/...") pairs, which
  // assumed the packages sat in THIS directory's node_modules — true in the standalone
  // web-zenly repo, false here: as an npm workspace, npm hoists them to the repo root instead,
  // and every one of those copies silently produced nothing. The site still built, so the only
  // symptom was Alpine and GSAP being absent at runtime.
  //
  // So resolve each file through Node instead of guessing a path: require.resolve finds the
  // package wherever npm actually put it (hoisted, nested, or deduped), and the files are
  // written in an `eleventy.after` hook so this does not depend on Eleventy's passthrough path
  // semantics for locations outside the input directory.
  const VENDOR_FILES = {
    "alpine.min.js": "alpinejs/dist/cdn.min.js",
    "gsap.min.js": "gsap/dist/gsap.min.js",
    "ScrollTrigger.min.js": "gsap/dist/ScrollTrigger.min.js",
    "SplitText.min.js": "gsap/dist/SplitText.min.js",
    "lenis.min.js": "lenis/dist/lenis.min.js"
  };
  // three.js passthrough removed 2026-11-04 (upstream): 2.07 MB was copied into every deploy
  // and no page referenced it. No `three` dependency exists in this package.json either — if a
  // 3D hero is added later, restore the passthrough and load it only on the page that needs it.

  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const outDir = path.join(__dirname, dir.output, "assets", "vendor");
    fs.mkdirSync(outDir, { recursive: true });

    // Fail loudly. A missing vendor file breaks the marketing site's animations and menus at
    // runtime while the build still reports success — exactly the failure this replaced.
    for (const [destName, spec] of Object.entries(VENDOR_FILES)) {
      let resolved;
      try {
        resolved = require.resolve(spec);
      } catch {
        throw new Error(
          `[vendor] cannot resolve "${spec}" — run npm install at the repo root so the ` +
            `marketing workspace's dependencies are present.`
        );
      }
      fs.copyFileSync(resolved, path.join(outDir, destName));
    }

    console.log(`[11ty] Copied ${Object.keys(VENDOR_FILES).length} vendor files to assets/vendor/`);
  });

  eleventyConfig.addGlobalData("env", process.env.ELEVENTY_ENV || "production");

  eleventyConfig.setServerOptions({
    port: 8080,
    host: "0.0.0.0",
    showAllHosts: true,
    liveReload: true,
    watch: ["_site/assets/css/tailwind.css"]
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
