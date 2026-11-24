import type { Metadata } from "next";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { AccountDataProvider } from "@/components/account/account-data-provider";
import { AccountShell } from "@/components/account/account-shell";
import { getProviders } from "@/lib/providers-data";

// A signed-in customer's own data — never worth indexing, for any page under /account.
export const metadata: Metadata = {
  title: "Your account | Zennly",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

/**
 * The first nested layout in this repo — every other page hand-rolls
 * `div > SiteNav > main > container > Footer` per-page (compare the old account/page.tsx with
 * saved/page.tsx). This owns that scaffold once for every /account/* route, plus the section nav
 * and the shared book-spa fetch (AccountDataProvider — see its own doc comment for why the fetch
 * itself is lazy, not triggered here).
 *
 * Stays a server component: `connectedStudios` is the same cheap local DB query the old
 * account/page.tsx already did, no reason to push it to the client. AccountShell (client) owns
 * everything that depends on auth state — the signed-out gate and the sidebar — which a server
 * component can't read.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const providers = await getProviders();
  const connectedStudios = providers
    .filter((p) => p.engineProviderId)
    .map((p) => ({ slug: p.slug, name: p.name, city: p.city, image: p.image }));

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <SiteNav />
      <main className="flex-1 pb-16">
        <AccountDataProvider connectedStudios={connectedStudios}>
          <AccountShell>{children}</AccountShell>
        </AccountDataProvider>
      </main>
      <Footer />
    </div>
  );
}
