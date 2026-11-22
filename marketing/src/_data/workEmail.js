// Mirror of src/lib/work-email.ts (the Next app, a separate workspace). Marketing has no
// bundler for client-side script tags, so there's no way to literally import that TS module
// into the inline <script> in _trial-modal.njk/index.njk — this Eleventy global data is
// interpolated into those scripts instead (same pattern already used there for edgex.key /
// edgex.base). src/lib/work-email.ts is the canonical source; keep this list in sync with it
// by hand.
module.exports = {
  freeDomains: ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me"],
};
