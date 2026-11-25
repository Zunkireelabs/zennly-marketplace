import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { NoStudios } from "@/components/home/no-studios";
import { DiscoveryRow } from "@/components/home/discovery-row";
import { Recommended } from "@/components/home/recommended";
import { BestRated } from "@/components/home/best-rated";
import { NewToZennly } from "@/components/home/new-to-zennly";
import { AllInOne } from "@/components/home/all-in-one";
import { PromoBanners } from "@/components/home/promo-banners";
import { Collections } from "@/components/home/collections";
import { ValueProps } from "@/components/home/value-props";
import { ProviderPitch } from "@/components/home/provider-pitch";
import { Reviews } from "@/components/home/reviews";
import { SocialProof } from "@/components/home/social-proof";
import { getHomeRails } from "@/lib/home-rails";
import { getCollectionTiles } from "@/lib/collections";

// Regenerate at most every 5 minutes, so database edits reach the homepage without a redeploy.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zennly.io";

// The homepage is what Google matches the brand search "zennly" to (it held position ~2.8 for
// that query before the marketing site moved to /businesses). It had no canonical, Open Graph
// or structured data after the move; this restores them. The Organization @id and the
// disambiguation are the SAME ones /businesses publishes, so the entity stays one entity.
export const metadata: Metadata = {
  title: { absolute: "Zennly: book spas, salons and wellness studios" },
  description:
    "Find and book spas, salons and wellness studios on Zennly. Curated providers, real reviews, booked in seconds. Software for businesses too.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: "Zennly",
    url: SITE_URL,
    title: "Zennly: book spas, salons and wellness studios",
    description: "Curated providers. Real reviews. Book in seconds.",
    locale: "en_NP",
    images: [{ url: `${SITE_URL}/businesses/assets/images/og-default.jpg`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Zennly",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/businesses/assets/images/logo.png` },
      disambiguatingDescription:
        "Zennly (zennly.io) is a booking marketplace and booking software for service businesses. It is not related to zennly.org, and it is not the Zenly social map app (Snap Inc.).",
      parentOrganization: { "@type": "Organization", name: "Zunkiree Labs", url: "https://zunkireelabs.com" },
      sameAs: [
        "https://www.g2.com/products/zennly",
        "https://www.goodfirms.co/software/zennly",
        "https://share.google/OMw78VXlwqW4GTaON",
        "https://www.capterra.com/p/10263080/Zennly/",
        "https://www.softwareadvice.com.au/software/764131/Zennly",
        "https://www.getapp.com.au/software/2367946/zennly",
        "https://www.wikidata.org/wiki/Q142026487",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Zennly",
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default async function Home() {
  const [rails, collections] = await Promise.all([getHomeRails(), getCollectionTiles()]);

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <Nav />
      <main className="flex-1 pb-24">
        <Hero destinations={rails.destinations} searchIndex={rails.searchIndex} />
        {!rails.hasStudios && <NoStudios />}
        <DiscoveryRow intents={rails.discoveryIntents} />
        <Recommended providers={rails.recommended} />
        <BestRated {...rails.bestRated} />
        <NewToZennly providers={rails.newToZennly} />
        <AllInOne providers={rails.allInOne} />
        <PromoBanners />
        <Collections collections={collections} />
        <ValueProps />
        <SocialProof />
        <ProviderPitch />
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
