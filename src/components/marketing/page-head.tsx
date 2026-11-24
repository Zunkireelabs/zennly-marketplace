import { MARKETING_SITE as site, marketingUrl } from "@/lib/marketing/site";

export interface PageHeadProps {
  /** Full <title> text, exactly as it should appear (the Eleventy build never appended a suffix). */
  title?: string;
  description?: string;
  /** Path under /businesses with no trailing slash: "" for the homepage, "/terms-of-service" for a page. */
  path: string;
  /** Site-relative image path, e.g. "/assets/images/og-default.jpg". */
  ogImage?: string;
  ogType?: string;
  /** Adds robots noindex,nofollow (the Eleventy build did this for non-production builds and `noindex: true` pages). */
  noindex?: boolean;
  /** Global pages skip the en-NP hreflang alternate. */
  globalPage?: boolean;
  /** Only for ogType "article". */
  article?: { datePublished: string; dateModified?: string; category?: string };
  /** The page's own JSON-LD blocks (the Organization block is already in the shell). */
  jsonLd?: object[];
}

/** JSON for a <script type="application/ld+json">: "<" escaped so a value can never close the tag. */
export function jsonLdText(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Everything marketing/src/_includes/_head-meta.njk emitted that varies per page, written once.
 *
 * Rendered from inside the page, not from the layout: React 19 hoists <title>, <meta> and <link>
 * out of the page tree into <head> on the server, so the raw HTML has them in <head> and React
 * escapes each value exactly once (the Next Metadata API double-escaped "&" in the trial).
 * Site-wide tags (charset/viewport, GA, fonts, stylesheet, icons, Organization JSON-LD) live in
 * MarketingShell instead.
 *
 * Caveat: <script> is not hoisted, so a page's own JSON-LD lands at the top of <body>, not in
 * <head>. Search engines read JSON-LD from anywhere in the document.
 */
export function PageHead({
  title = site.defaultTitle,
  description = site.defaultDescription,
  path,
  ogImage = site.defaultOgImage,
  ogType = "website",
  noindex = false,
  globalPage = false,
  article,
  jsonLd = [],
}: PageHeadProps) {
  const url = marketingUrl(path);
  const image = marketingUrl(ogImage);
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      <link rel="alternate" hrefLang="en" href={url} />
      {globalPage ? null : <link rel="alternate" hrefLang="en-NP" href={url} />}
      <link rel="alternate" hrefLang="x-default" href={url} />

      <link rel="alternate" type="application/atom+xml" title="Zennly Blog" href={marketingUrl("/feed.xml")} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={site.locale} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Zennly: booking and operations software for service businesses in Nepal" />
      {ogType === "article" && article ? (
        <>
          <meta property="article:published_time" content={article.datePublished} />
          <meta property="article:modified_time" content={article.dateModified ?? article.datePublished} />
          <meta property="article:author" content={marketingUrl("/about")} />
          {article.category ? <meta property="article:section" content={article.category} /> : null}
        </>
      ) : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(block) }} />
      ))}
    </>
  );
}
