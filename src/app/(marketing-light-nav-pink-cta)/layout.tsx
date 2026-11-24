import { MarketingShell } from "@/components/marketing/marketing-shell";

// Blog posts with front matter `bodyClass: page--light-nav page--pink-cta`. See (marketing-light-nav)/layout.tsx.
export default function MarketingLightNavPinkCtaLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell bodyClass="page--light-nav page--pink-cta">{children}</MarketingShell>;
}
