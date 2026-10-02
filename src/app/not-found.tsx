import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { pillClass } from "@/components/ui/pill";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-muted-foreground">The studio or page may have moved, or the link may be mistyped.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={pillClass({ selected: true })}>
            Back to home
          </Link>
          <Link href="/search" className={pillClass()}>
            Browse studios
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
