import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { BookHero } from "@/components/booking/book-hero";
import { BookFlow } from "@/components/booking/flow";
import { isEngineActive } from "@/lib/booking/engine-flag";
import { applyLiveServices } from "@/lib/booking/load-provider";
import { getProvider } from "@/lib/providers-data";
import { getProviderBookingStatus, isBookable } from "@/lib/booking/studio-status";

export async function generateMetadata({ params }: LayoutProps<"/providers/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  return { title: provider ? `Book ${provider.name} | Zennly` : "Book | Zennly", robots: { index: false } };
}

/**
 * The booking pages of a connected studio (ZNLY-338). A studio with no live booking system has no
 * booking pages: it keeps the demo drawer on its own page, so it is sent back there.
 */
export default async function BookLayout({ children, params }: LayoutProps<"/providers/[slug]/book">) {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();
  if (!isEngineActive(provider.engineProviderId)) redirect(`/providers/${slug}`);
  // Only a studio bookX says is live has booking pages. Not live, a demo, or a failed check all
  // go back to the studio page, which says why (ZNLY-346).
  if (!isBookable(await getProviderBookingStatus(provider.engineProviderId))) redirect(`/providers/${slug}`);

  await applyLiveServices(provider);

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <SiteNav variant="solid" />
      <main className="flex-1">
        <BookHero provider={provider} />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <BookFlow provider={provider}>{children}</BookFlow>
        </div>
      </main>
      <Footer />
    </div>
  );
}
