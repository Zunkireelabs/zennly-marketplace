import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";

/**
 * Shared frame for the marketplace's own legal pages (/terms, /privacy). The business-software
 * policies live under /businesses and stay as they are; these two cover shoppers.
 * Source text: docs/legal/marketplace-*-DRAFT.md. Keep the two in step.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:py-20">
        <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
        {updated && <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>}
        <div className="mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-foreground/90">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}
