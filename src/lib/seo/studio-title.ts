const MAX = 60;

/**
 * Studio page title, kept to about 60 characters so search results don't cut it off.
 * Fullest form first; if it is too long, drop the studio type, then the city, and only as a last
 * resort shorten the name itself. Always ends with "| Zennly".
 */
export function studioTitle(name: string, modality: string, city: string): string {
  const options = [`${name} · ${modality} in ${city} | Zennly`, `${name} in ${city} | Zennly`, `${name} | Zennly`];
  const fit = options.find((t) => t.length <= MAX);
  if (fit) return fit;
  const room = MAX - " | Zennly".length - 1;
  return `${name.slice(0, room).trimEnd()}… | Zennly`;
}
