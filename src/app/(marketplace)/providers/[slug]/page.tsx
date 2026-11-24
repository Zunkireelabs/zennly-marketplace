import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { studioSummary } from "@/lib/seo/studio-summary";
import { studioTitle } from "@/lib/seo/studio-title";
import { getProvider, getRelatedProviders } from "@/lib/providers-data";
import { applyLiveServices } from "@/lib/booking/load-provider";
import { getProviderBookingStatus } from "@/lib/booking/studio-status";
import { availabilityFor } from "@/lib/booking/availability";
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

// Rendered on every request: whether a studio takes online bookings (bookX's live switch) must
// never be frozen into a cached page. The studio's data reads are cheap and the status check has
// its own 60s cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/providers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) return {};
  const title = studioTitle(provider.name, provider.modality, provider.city);
  // Some studios have no intro yet: fall back to a plain sentence from facts we do hold, so the
  // search snippet is never empty.
  const description =
    provider.intro[0]?.trim() || studioSummary(provider);
  const path = `/providers/${provider.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title, description, images: provider.image ? [{ url: provider.image }] : undefined },
  };
}

export default async function ProviderPage({ params }: PageProps<"/providers/[slug]">) {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();

  // Checked on every request (60s cache inside), never frozen into a cached page: whether a studio
  // takes online bookings changes the moment bookX switches it. Only a live studio's services are
  // read from the booking engine.
  const availability = availabilityFor(provider.engineProviderId, await getProviderBookingStatus(provider.engineProviderId));
  if (availability.state === "live") await applyLiveServices(provider);

  const related = await getRelatedProviders(provider);

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://zennly.io";
  // Facts only. No aggregateRating: our ratings come from third-party listings, and Google's rules
  // want review markup to describe reviews collected on the page's own site.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": `${origin}/providers/${provider.slug}#business`,
    name: provider.name,
    url: `${origin}/providers/${provider.slug}`,
    ...(provider.image ? { image: provider.image.startsWith("http") ? provider.image : `${origin}${provider.image}` } : {}),
    address: {
      "@type": "PostalAddress",
      ...(provider.address ? { streetAddress: provider.address } : {}),
      addressLocality: provider.city,
      ...(provider.region ? { addressRegion: provider.region } : {}),
    },
    ...(provider.lat !== undefined && provider.lng !== undefined
      ? { geo: { "@type": "GeoCoordinates", latitude: provider.lat, longitude: provider.lng } }
      : {}),
  };

  return (
    <ProviderShell provider={provider} availability={availability}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
                <Policies provider={provider} />
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
