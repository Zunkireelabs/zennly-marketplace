import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { getProvider, getProviders, getRelatedProviders } from "@/lib/providers-data";
import { ProviderShell } from "@/components/provider/provider-shell";
import { ProviderHero } from "@/components/provider/hero";
import { BookingCard, MobileBookBar } from "@/components/provider/booking-card";
import { TabBar } from "@/components/provider/tab-bar";
import { ServicesSection } from "@/components/provider/services-section";
import { ReviewsSection } from "@/components/provider/reviews-section";
import { LookInside } from "@/components/provider/look-inside";
import { StudioHistory } from "@/components/provider/studio-history";
import {
  Amenities,
  Breadcrumb,
  Location,
  Overview,
  Policies,
} from "@/components/provider/sections";
import { RelatedProviders } from "@/components/provider/related-providers";

// Regenerate at most every 5 minutes, so database edits reach provider pages without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  const providers = await getProviders();
  return providers.map((provider) => ({ slug: provider.slug }));
}

export async function generateMetadata({ params }: PageProps<"/providers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) return {};
  return {
    title: `${provider.name} · ${provider.modality} in ${provider.city} | Zennly`,
    description: provider.intro[0],
  };
}

export default async function ProviderPage({ params }: PageProps<"/providers/[slug]">) {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();

  const related = await getRelatedProviders(provider);

  return (
    <ProviderShell provider={provider}>
      <div className="relative flex min-h-full flex-col bg-background">
        <SiteNav variant="overlay" />
        <main className="flex-1 pb-28 lg:pb-16">
          <ProviderHero provider={provider} />

          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
                <Breadcrumb provider={provider} />
                <TabBar />
                <Overview provider={provider} />
                <StudioHistory provider={provider} />
                <ServicesSection />
                <LookInside />
                <ReviewsSection provider={provider} />
                <Amenities provider={provider} />
                <Location provider={provider} />
                <Policies />
              </div>

              {/* The card is pulled up over the hero's lower edge; sticky keeps it in view. */}
              <aside className="relative z-10 hidden lg:block" aria-label="Book this studio">
                <div className="sticky top-6 -mt-[300px]">
                  <BookingCard />
                </div>
              </aside>
            </div>
          </div>

          <RelatedProviders related={related} />
        </main>
        <Footer />
      </div>
      <MobileBookBar />
    </ProviderShell>
  );
}
