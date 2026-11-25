import { FREE_EMAIL_DOMAINS } from "@/lib/work-email";
import { NAV_ICONS, NAV_MENU } from "@/lib/marketing/nav-menu";
import { TRIAL_MODAL_TEMPLATE } from "./trial-modal-template";

/**
 * Lead-capture beacon of the pop-up (EdgeX form builder). The live mirror was built with an EMPTY key
 * (EDGEX_API_KEY was not set when it was generated), and the script's `if (!EDGEX_KEY) return;` makes
 * the beacon a no-op in that case. Kept empty on purpose so this port changes nothing; to turn the
 * beacon on, put the public crm_live_ key here (or read it from env) as a deliberate, separate change.
 */
const EDGEX = {
  key: "",
  url: "https://edgex.zunkireelabs.com/api/public/submit/zennly/try-for-free",
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function iconSvg(name: string): string {
  return `<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${NAV_ICONS[name]}"/></svg>`;
}

/** Step-1 "what kind of business" choices: one per entry in the nav's Types menu. */
function typeOptionsHtml(): string {
  return (NAV_MENU.types.items ?? [])
    .map(
      (t) =>
        `<label class="tf-product tf-type"><input type="radio" name="businessType" value="${escapeHtml(t.label)}" required><span class="tf-product__box"><span class="tf-product__icon">${iconSvg(t.icon)}</span><span class="tf-product__text"><strong>${escapeHtml(t.label)}</strong></span></span></label>`
    )
    .join("\n                ");
}

/** Step-2 "start with" choices: one per Capabilities group, listing that group's items. */
function groupOptionsHtml(): string {
  return (NAV_MENU.capabilities.groups ?? [])
    .map(
      (g) =>
        `<label class="tf-product"><input type="radio" name="seeFirst" value="${escapeHtml(g.label)}"><span class="tf-product__box"><span class="tf-product__icon">${iconSvg(g.items[0].icon)}</span><span class="tf-product__text"><strong>${escapeHtml(g.label)}</strong><small>${g.items.map((i) => escapeHtml(i.label)).join(", ")}</small></span></span></label>`
    )
    .join("\n                ");
}

/** Inline JSON for a script literal: "<" escaped so a value can never close the script tag. */
const jsLiteral = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * The demo pop-up (was _trial-modal.njk), as an HTML string (react-dom/server cannot be imported into a
 * Server Component, so the two option lists are plain string builders over the same typed data). The static markup and script come from
 * the template; the business-type and capability choices, the free-email list and the EdgeX values
 * are filled from typed data, each defined once.
 */
export function trialModalHtml(): string {
  return TRIAL_MODAL_TEMPLATE.replace("@@TYPES@@", () => "\n                " + typeOptionsHtml() + "\n              ")
    .replace("@@GROUPS@@", () => "\n                " + groupOptionsHtml() + "\n              ")
    .replace("@@FREE_DOMAINS@@", () => jsLiteral(FREE_EMAIL_DOMAINS))
    .replace("@@EDGEX_KEY@@", () => jsLiteral(EDGEX.key))
    .replace("@@EDGEX_URL@@", () => jsLiteral(EDGEX.url));
}
