import path from "node:path";
import { defineConfig } from "vitest/config";

// Lets tests import "@/..." the same way the app does (tsconfig paths).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
