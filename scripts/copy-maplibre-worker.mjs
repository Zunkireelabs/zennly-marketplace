// MapLibre runs tile parsing in a web worker. Next/Turbopack can't resolve the worker URL the
// library builds internally ("Worker failed to load"), so we serve the worker files ourselves
// from /public/maplibre and point MapLibre at them with setWorkerUrl() (see studio-map.tsx).
// Copied from node_modules on every install so the worker always matches the installed version.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";
if (existsSync(from)) {
  mkdirSync(to, { recursive: true });
  for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
