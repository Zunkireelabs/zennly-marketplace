export type Sheet = null | "location" | "form";

export type SheetAction =
  | "openPill"
  | "chevron"
  | "pickCity"
  | "pickService"
  | "pickStudio"
  | "tapWhere"
  | "search"
  | "back";

/**
 * Where the mobile full-screen search sheet goes next. The chevron means two different things
 * depending on which screen is showing (advance from the location picker, close from the form),
 * and Android's hardware back button has to agree with whatever the chevron would have done —
 * this table is the single place that decides both, so the two can't drift apart.
 *
 * `pickCity` and `pickService` land on the same screen (`form`) but are kept as distinct actions
 * rather than one overloaded name — a studio instead closes the sheet outright (`pickStudio`),
 * since picking one navigates away from the page entirely.
 *
 * Combinations not in the design doc's table (e.g. opening while already open) are a no-op: the
 * sheet is left exactly as it was.
 */
export function nextSheet(sheet: Sheet, action: SheetAction): Sheet {
  if (sheet === null && action === "openPill") return "location";
  if (sheet === "location" && (action === "chevron" || action === "pickCity" || action === "pickService")) {
    return "form";
  }
  if (sheet === "location" && action === "pickStudio") return null;
  if (sheet === "form" && (action === "chevron" || action === "search" || action === "back")) return null;
  if (sheet === "form" && action === "tapWhere") return "location";
  if (sheet === "location" && action === "back") return "form";
  return sheet;
}
