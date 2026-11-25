import { SiteNav } from "../shared/site-nav";
import { trialModalHtml } from "../shared/trial-modal";
import { PageHead } from "../page-head";
import { BLOG_SPA_MAIN_HTML } from "./blog-spa-booking-app-nepal-main-html";

export const BLOG_SPA_HEAD = {
  title: "Spa Booking App Nepal: Online Booking for Spas | Zennly",
  description:
    "Take spa bookings from residents and tourists 24 hours a day, without a phone call. A booking app guide for spas in Kathmandu, Pokhara and across Nepal.",
  path: "/blog/spa-booking-app-nepal",
  ogType: "article",
  article: { datePublished: "2026-10-12", dateModified: "2026-10-12", category: "Spa & Wellness" },
};

const wrap = { display: "contents" } as const;

/**
 * Nav (shared component), then the post's three JSON-LD blocks and <main> as an exact string (the footer is
 * INSIDE <main> on the blog layout, so MarketingBody's header/main/footer order does not fit), then the demo pop-up.
 */
export function BlogSpaBookingAppNepalPage() {
  return (
    <>
      <PageHead {...BLOG_SPA_HEAD} />
      <SiteNav />
      <div style={wrap} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BLOG_SPA_MAIN_HTML }} />
      <div style={wrap} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: trialModalHtml() }} />
    </>
  );
}
