import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HOME_HEAD_CSS } from "@/components/marketing/pages/home-style";

// The homepage has no body class and one inline <style> that no other page has (it came from the
// page's `extraHead` front matter). Its own root layout puts that style last in <head>, after tailwind.css.
export default function MarketingHomeLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell headCss={HOME_HEAD_CSS}>{children}</MarketingShell>;
}
