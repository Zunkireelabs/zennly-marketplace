import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored/generated static assets in public/ are not our source: public/maplibre/ (copied
    // by scripts/copy-maplibre-worker.mjs) and public/businesses/ (mirrored web-zenly build,
    // scripts/sync-businesses-site.mjs — includes third-party vendor bundles like gsap/three)
    // were never meant to be linted as our code.
    "public/maplibre/**",
    "public/businesses/**",
  ]),
]);

export default eslintConfig;
