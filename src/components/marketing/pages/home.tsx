import { PageHead } from "../page-head";
import { HOME_BODY_HTML } from "./home-html";

export const HOME_HEAD = {
  title: "Spa & Salon Booking Software in Nepal | Free Demo | Zennly",
  description:
    "Stop double-bookings and discount leakage. Booking, staff, payroll, payments and reports for spas, salons and gyms in Nepal. Book a 20-minute demo.",
  path: "",
};

/**
 * The homepage brings its own nav, footer, demo pop-up and FAQ JSON-LD inside its markup (ownNav page),
 * and the nav sits inside #v2-root, so the whole body is one exact string rather than the shared
 * components (whose DOM differs). Same wrapper as MarketingBody's.
 */
export function HomePage() {
  return (
    <>
      <PageHead {...HOME_HEAD} />
      <div style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HOME_BODY_HTML }} />
    </>
  );
}
