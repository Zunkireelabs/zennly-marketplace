/**
 * Single-branch vs multi-branch rule, kept pure so it can be tested. Mirrors book-spa's own
 * provider-profile-flow rule: auto-select only when there is exactly one branch; with several,
 * the customer must choose, because silently picking the first risks booking the wrong location.
 */
export function initialBranch<T>(branches: readonly T[]): T | null {
  return branches.length === 1 ? branches[0] : null;
}

/** True when the location step must be shown: more than one branch and none chosen yet. */
export function needsLocationStep(branchesLoaded: boolean, branchCount: number, hasSelection: boolean): boolean {
  return branchesLoaded && branchCount > 1 && !hasSelection;
}
