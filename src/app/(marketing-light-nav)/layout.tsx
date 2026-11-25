import { MarketingShell } from "@/components/marketing/marketing-shell";

// One root layout per <body class> variant, so the class is correct in the server-sent HTML with
// no client script. Marketing pages whose Eleventy front matter said `bodyClass: page--light-nav`
// live under this group. To add another variant: copy this folder to e.g.
// `(marketing-light-nav-pink-cta)/`, change the string below, and put its pages in it.
// Navigating between variants is a full page load (as it was on the static site).
export default function MarketingLightNavLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell bodyClass="page--light-nav">{children}</MarketingShell>;
}
