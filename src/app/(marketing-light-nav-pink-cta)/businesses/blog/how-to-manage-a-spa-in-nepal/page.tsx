import { GeneratedPage } from "@/components/marketing/generated-page";
import { FOOTER_INLINE, HEAD, MAIN, TAIL } from "@/components/marketing/pages/generated/blog-how-to-manage-a-spa-in-nepal";

export default function Page() {
  return <GeneratedPage head={HEAD} main={MAIN} tail={TAIL} footerInline={FOOTER_INLINE} />;
}
