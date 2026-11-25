import type { Provider } from "@/lib/providers";

/**
 * One plain, quotable answer to "what is this studio?", built only from facts the database holds
 * (no prices or hours: those vary by studio and branch and are shown further down the page).
 * It is shown on the page (answer-engine optimisation: a direct answer near the top that search
 * snippets and AI assistants can lift) and reused as the meta description when a studio has no
 * written intro, so the two can never disagree.
 */
export function studioSummary(p: Pick<Provider, "name" | "modality" | "location" | "city" | "serviceCategories" | "services">): string {
  const where = p.location || p.city;
  const kind = p.modality.toLowerCase();
  const cats = p.serviceCategories.filter(Boolean).slice(0, 3);
  const offers = cats.length ? ` It offers ${cats.length > 1 ? `${cats.slice(0, -1).join(", ")} and ${cats[cats.length - 1]}` : cats[0]}.` : "";
  const n = Array.isArray(p.services) ? p.services.length : 0;
  const count = n > 0 ? ` ${n} ${n === 1 ? "service is" : "services are"} listed with prices.` : "";
  return `${p.name} is a ${kind} in ${where}.${offers}${count} You can see details and book on Zennly.`;
}
