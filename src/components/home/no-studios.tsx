import Link from "next/link";
import { MARKETING_SITE_HOME } from "@/lib/marketing-links";

/** Shown under the hero when there are no studios to show anywhere on the home page (ZNLY-348). */
export function NoStudios() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-12" aria-label="No studios yet">
      <div className="rounded-[var(--radius-lg)] bg-muted px-6 py-12 text-center sm:py-16">
        <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
          New studios are joining Zennly soon
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          We&rsquo;re getting the first studios ready. Check back shortly.
        </p>
        <Link href={MARKETING_SITE_HOME} className="mt-5 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline">
          Own a studio? List it on Zennly
        </Link>
      </div>
    </section>
  );
}
