import { SiteNav } from "./shared/site-nav";
import { SiteFooter } from "./shared/site-footer";
import { trialModalHtml } from "./shared/trial-modal";

/** Raw markup inside a layout-neutral wrapper. React never patches or diffs the inside of it (see MarketingBody). */
function Html({ html }: { html: string }) {
  return <div style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * A marketing page's body: the shared header, the page's own markup, the shared footer and the
 * demo pop-up, in the order base.njk emitted them.
 *
 * Header and footer are real React components (components/marketing/shared/). The pop-up and the
 * page's own markup are exact HTML strings in `display: contents` wrappers: those contain scripts and
 * regions the page's JavaScript (GSAP, SplitText, Alpine, Lenis) rewrites right after load, and React
 * must not diff them against what the DOM has become. `suppressHydrationWarning` silences React's
 * dev-only check of such a string against the already-modified DOM.
 *
 * `main` is the markup between header and footer, `tail` whatever follows the footer.
 */
export function MarketingBody({ main, tail = "", ownNav = false }: { main: string; tail?: string; ownNav?: boolean }) {
  return (
    <>
      {ownNav ? null : <SiteNav />}
      <Html html={main} />
      <SiteFooter />
      {tail ? <Html html={tail} /> : null}
      {ownNav ? null : <Html html={trialModalHtml()} />}
    </>
  );
}
