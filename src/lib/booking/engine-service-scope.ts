/**
 * Which services a branch offers online. A faithful port of book-spa's
 * fetchBookableServicesByOrgSlug(orgSlug, branchId) narrowing: the org-wide list minus the
 * branch's excluded_service_categories, minus any service restricted (via branch_service_links)
 * to OTHER branches. A service with no link rows is unrestricted everywhere; one with rows is
 * only offered at the branches it's linked to.
 *
 * Pure, and shared by the drawer (one branch) and the studio page (the union across branches),
 * so the page can never list a service the drawer would never offer at any branch.
 */
export type ServiceLink = { service_id: string; branch_id: string };

export function narrowServicesToBranch<T extends { id: string; category: string }>(
  all: readonly T[],
  excludedCategories: readonly string[],
  links: readonly ServiceLink[] | null,
  branchId: string
): T[] {
  const filtered = excludedCategories.length > 0 ? all.filter((s) => !excludedCategories.includes(s.category)) : [...all];
  if (filtered.length === 0 || !links || links.length === 0) return filtered;
  const restricted = new Set(links.map((l) => l.service_id));
  const allowedHere = new Set(links.filter((l) => l.branch_id === branchId).map((l) => l.service_id));
  return filtered.filter((s) => !restricted.has(s.id) || allowedHere.has(s.id));
}

/** Services offered at ANY of the given branches, in the original order. */
export function servicesOfferedAtAnyBranch<T extends { id: string; category: string }>(
  all: readonly T[],
  branches: readonly { id: string; excludedCategories: readonly string[] }[],
  links: readonly ServiceLink[] | null
): T[] {
  const offered = new Set<string>();
  for (const b of branches) {
    for (const s of narrowServicesToBranch(all, b.excludedCategories, links, b.id)) offered.add(s.id);
  }
  return all.filter((s) => offered.has(s.id));
}
