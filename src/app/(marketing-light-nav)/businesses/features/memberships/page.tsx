import { GeneratedPage } from "@/components/marketing/generated-page";
import { FOOTER_INLINE, HEAD, MAIN, TAIL } from "@/components/marketing/pages/generated/features-memberships";

export default function Page() {
  return <GeneratedPage head={HEAD} main={MAIN} tail={TAIL} footerInline={FOOTER_INLINE} />;
}
