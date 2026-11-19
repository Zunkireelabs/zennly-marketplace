import type { Metadata } from "next";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { ProfileView } from "@/components/account/profile-view";
import { getProviders } from "@/lib/providers-data";

// A signed-in customer's own data — never worth indexing.
export const metadata: Metadata = {
  title: "Your profile | Zennly",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

export default async function AccountPage() {
  const providers = await getProviders();
  // Only engine-connected studios have anything to look up — book-spa has no record of the rest.
  const connectedStudios = providers
    .filter((p) => p.engineProviderId)
    .map((p) => ({ slug: p.slug, name: p.name, city: p.city, image: p.image }));

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <SiteNav />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <ProfileView connectedStudios={connectedStudios} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
