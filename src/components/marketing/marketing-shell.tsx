import { MARKETING_SITE as site, marketingPath } from "@/lib/marketing/site";
import { organizationSchema } from "@/lib/marketing/organization-schema";
import { jsonLdText } from "./page-head";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Baloo+2:wght@600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap";

/** Same inline snippet base.njk emitted (kept as the exact text, so GA sees what it always saw). */
const GTAG_INLINE = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', '${site.gaId}');
  `;

/** Vendor scripts + main.js, in the order and with the cache-buster versions base.njk used. */
const SCRIPTS = [
  "/assets/vendor/alpine.min.js",
  "/assets/vendor/gsap.min.js",
  "/assets/vendor/ScrollTrigger.min.js",
  "/assets/vendor/SplitText.min.js",
  "/assets/vendor/lenis.min.js",
  "/assets/js/main.js?v=15",
];

/**
 * The document around every marketing page (was base.njk): <html>, site-wide <head> tags, <body>,
 * and the deferred script tags. The body class is a prop because it must be right in the HTML the
 * server sends, with no client script to fix it afterwards; each body-class variant is one tiny
 * root layout that renders this with its own class (see src/app/(marketing-*)/layout.tsx).
 *
 * Per-page head tags (title, description, canonical, og:*) come from <PageHead/> in the page.
 */
export function MarketingShell({
  bodyClass,
  headCss,
  children,
}: {
  bodyClass?: string;
  /** A page-only inline stylesheet (the homepage's), emitted as the LAST tag in <head>, after tailwind.css, as base.njk's extraHead did. */
  headCss?: string;
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: Lenis (main.js) adds class="lenis" to <html> and other page scripts touch
    // <body> attributes before React hydrates. That is expected, not a bug; React leaves them alone.
    <html lang="en" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${site.gaId}`} />
        <script dangerouslySetInnerHTML={{ __html: GTAG_INLINE }} />

        <meta name="author" content={site.name} />
        <meta name="geo.region" content="NP-BA" />
        <meta name="geo.placename" content="Lalitpur, Nepal" />
        <meta name="geo.position" content="27.6588;85.3247" />
        <meta name="ICBM" content="27.6588, 85.3247" />
        <meta name="theme-color" content="#3F6839" />
        <link rel="icon" type="image/png" sizes="400x400" href={marketingPath("/assets/images/favicon.png?v=3")} />
        <link rel="apple-touch-icon" href={marketingPath("/assets/images/favicon.png?v=3")} />
        <link rel="manifest" href={marketingPath("/site.webmanifest")} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(organizationSchema()) }} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONTS_HREF} rel="stylesheet" />
        <link rel="stylesheet" href={marketingPath("/assets/css/tailwind.css?v=47")} />
        {headCss ? <style dangerouslySetInnerHTML={{ __html: headCss }} /> : null}
      </head>
      <body className={bodyClass} suppressHydrationWarning>
        {children}
        {SCRIPTS.map((src) => (
          <script key={src} src={marketingPath(src)} defer />
        ))}
      </body>
    </html>
  );
}
