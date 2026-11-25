import { notFound } from "next/navigation";

// Catch-all so an unmatched URL gets the marketplace 404 inside the marketplace layout, with a 404 status.
// With two root layouts (marketplace + marketing) there is no single app/layout.tsx for Next's own
// unmatched-URL 404 to render inside, and the experimental global-not-found.tsx that would replace it
// leaks the marketplace's font preloads into every /businesses page (checked in a production build).
export default function Unmatched() {
  notFound();
}
