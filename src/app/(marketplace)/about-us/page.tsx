import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { pillClass } from "@/components/ui/pill";
import { getProviders } from "@/lib/providers-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zennly.io";

const TITLE = "About Zennly: book spas, salons and wellness studios";
const DESCRIPTION =
  "Zennly is a marketplace for finding and booking spas, salons and wellness studios, starting in Nepal. See real services and prices, then book in a few steps.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about-us" },
  openGraph: {
    type: "website",
    url: "/about-us",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/businesses/assets/images/og-default.jpg", width: 1200, height: 630 }],
  },
};

// Hourly is plenty: the studio list below changes only when a studio is added.
export const revalidate = 3600;

const STEPS = [
  { n: "1", title: "Find a studio", body: "Search by place or treatment, on a list or a map, or browse a curated collection." },
  { n: "2", title: "See what it costs", body: "Each studio shows its services, prices, photos and where it is, before you commit to anything." },
  { n: "3", title: "Book a time", body: "Pick a service, a day and a time. Zennly passes the booking to the studio, and you pay at the studio." },
];

const WHY = [
  { title: "Real services, real prices", body: "Studios list what they actually offer, so you are not guessing from a photo." },
  { title: "Bookings go to the studio", body: "Your booking reaches the studio's own booking system, so the time you choose is the time they see." },
  { title: "Starting in Nepal", body: "Made by Zunkiree Labs in Lalitpur for everyone who wants to book self-care. Nepal is where we are focused first." },
  { title: "Your data stays yours", body: "You can edit your profile, download your data and delete your account yourself in your account settings." },
];

// Every answer is something the product actually does today. Shown on the page and published as
// FAQPage data, so the two always match.
const FAQ = [
  { q: "What is Zennly?", a: "Zennly is a marketplace where you can find spas, salons and wellness studios, see their services and prices, and book a time. It is made by Zunkiree Labs and is starting in Nepal." },
  { q: "Do I pay on Zennly?", a: "No. The marketplace does not take payment. You pay at the studio." },
  { q: "Does Zennly provide the treatments?", a: "No. Studios are independent businesses. You arrange the visit with the studio, and Zennly passes your booking details to it." },
  { q: "Do I need an account to book?", a: "You can browse and search without one. To book, you sign in with your email or with Google." },
  { q: "Can I cancel or change a booking?", a: "Cancellation and no-show rules are set by each studio. Contact the studio first. If you need help, email info@zennly.io and we will help where we reasonably can." },
  { q: "Where do the ratings come from?", a: "Ratings and review summaries come from third-party listings, such as Google Business profiles. People cannot post reviews on Zennly itself yet." },
  { q: "How do I delete my account or get my data?", a: "In your account settings you can download your data and delete your account yourself. Bookings are kept by the booking system and the studio; email info@zennly.io about those." },
  { q: "I run a spa, salon or gym. Can I use Zennly?", a: "Zennly also makes booking and operations software for businesses: bookings, staff, payments and reports. See Zennly for businesses, or email info@zennly.io." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/about-us#page`,
      url: `${SITE_URL}/about-us`,
      name: TITLE,
      description: DESCRIPTION,
      about: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/about-us#faq`,
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default async function AboutPage() {
  // A failed lookup must never break the page: the studio list is a bonus, not the content.
  const studios = await getProviders().then((p) => p.slice(0, 8)).catch(() => []);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <section className="mx-auto max-w-4xl px-5 pb-10 pt-16 sm:pt-24">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">About Zennly</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.1] sm:text-6xl">A calmer way to find and book self-care.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80">
            Zennly is a marketplace for spas, salons and wellness studios, for everyone and starting in Nepal. See what a studio offers and what it
            costs, then book a time in a few steps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className={pillClass({ selected: true })}>
              Browse studios
            </Link>
            <Link href="/collections/recovery-rituals" className={pillClass()}>
              See collections
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">Why Zennly</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {WHY.map((w) => (
              <li key={w.title} className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
                <h3 className="font-semibold">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {studios.length > 0 && (
          <section className="mx-auto max-w-4xl px-5 py-10">
            <h2 className="text-2xl font-semibold">Studios on Zennly</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {studios.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/providers/${s.slug}`}
                    className="block rounded-[var(--radius-lg)] border border-border bg-card p-4 transition-colors duration-150 hover:border-foreground/40"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {s.modality} · {s.location || s.city}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <Link href="/search" className="underline underline-offset-2">
                See all studios
              </Link>
            </p>
          </section>
        )}

        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">Questions</h2>
          <div className="mt-6 flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[var(--radius-lg)] border border-border bg-card p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span aria-hidden className="text-muted-foreground transition-transform duration-150 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-20 pt-10">
          <div className="rounded-[var(--radius-lg)] border border-border bg-muted p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Run a spa, salon or gym?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Zennly also makes the booking and operations software that studios use: bookings, staff, payments and
              reports.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/businesses" className={pillClass({ selected: true })}>
                Zennly for businesses
              </Link>
              <a href="mailto:info@zennly.io" className={pillClass()}>
                info@zennly.io
              </a>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Zennly is made by Zunkiree Labs, Sanepa, 44600, Nepal. See our <Link className="underline" href="/terms">Terms</Link>{" "}
            and <Link className="underline" href="/privacy">Privacy Policy</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
