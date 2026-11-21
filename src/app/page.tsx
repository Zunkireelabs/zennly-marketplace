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

export default async function Home() {
  const [rails, collections] = await Promise.all([getHomeRails(), getCollectionTiles()]);

  return (
    <div className="relative flex min-h-full flex-col bg-background">
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
