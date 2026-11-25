/**
 * Site-wide constants for the marketing site (zennly.io/businesses). The single source for what
 * marketing/src/_data/site.js used to supply to base.njk and _head-meta.njk, production values
 * only. Values here are the ones the built mirror actually contains, because the mirror is what
 * Google has indexed.
 */
export const MARKETING_SITE = {
  /** Origin every canonical / og / hreflang URL is built on. */
  origin: "https://zennly.io",
  /** The marketing site lives under this path on the marketplace's domain. */
  basePath: "/businesses",
  name: "Zennly",
  locale: "en_NP",
  defaultTitle: "Zennly \u2014 Online Booking & Operations Platform for Service Businesses",
  defaultDescription: "Zennly is the multi-branch booking and operations platform for spas, salons, and appointment-based service businesses in Nepal — online booking, staff scheduling, payments, and daily reconciliation in one system.",
  defaultOgImage: "/assets/images/og-default.jpg",
  logo: "/assets/images/logo.png",
  foundingDate: "2026",
  slogan: "Booking & operations software for service businesses in Nepal",
  alternateName: "Zennly booking software",
  disambiguatingDescription: "Zennly (zennly.io) is booking and operations software for service businesses in Nepal. It is not related to zennly.org, and it is not the Zenly social map app (Snap Inc.): Zennly with two n's is Nepal's multi-branch booking, staff, attendance and payroll software for spas, salons, gyms and clinics.",
  telephone: "+977-9747491787",
  address: { locality: "Lalitpur", region: "Bagmati Province", postalCode: "44600", country: "NP" },
  parentOrganization: { name: "Zunkiree Labs", url: "https://zunkireelabs.com" },
  sameAs: [
  "https://www.g2.com/products/zennly",
  "https://www.goodfirms.co/software/zennly",
  "https://share.google/OMw78VXlwqW4GTaON",
  "https://www.capterra.com/p/10263080/Zennly/",
  "https://www.softwareadvice.com.au/software/764131/Zennly",
  "https://www.getapp.com.au/software/2367946/zennly",
  "https://www.wikidata.org/wiki/Q142026487"
],
  /** Production Google Analytics tag (the Eleventy build only emitted it when isProd). */
  gaId: "G-6LYQRZY03B",
} as const;

/** Absolute URL of a path under the marketing site, e.g. "/assets/images/x.png" -> https://zennly.io/businesses/assets/images/x.png */
export function marketingUrl(pathUnderBase = ""): string {
  return `${MARKETING_SITE.origin}${MARKETING_SITE.basePath}${pathUnderBase}`;
}

/** Root-relative URL of a path under the marketing site, for links the browser loads itself (css, js, icons). */
export function marketingPath(pathUnderBase = ""): string {
  return `${MARKETING_SITE.basePath}${pathUnderBase}`;
}
