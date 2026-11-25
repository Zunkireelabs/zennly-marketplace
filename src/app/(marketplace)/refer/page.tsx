import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { ReferPanel } from "@/components/referral/refer-panel";

const TITLE = "Refer a friend to Zennly, get a free extra";
const DESCRIPTION = "Invite a friend to Zennly. When they make their first booking, you get a free extra at a participating studio.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/refer" },
  openGraph: { type: "website", url: "/refer", title: TITLE, description: DESCRIPTION, images: [{ url: "/businesses/assets/images/og-default.jpg", width: 1200, height: 630 }] },
};

const STEPS = [
  { n: "1", title: "Get your link", body: "Sign in and your personal invite link appears at the top of this page." },
  { n: "2", title: "Send it to a friend", body: "Share it by message or email. They sign up to Zennly through your link." },
  { n: "3", title: "They book, you get a treat", body: "When your friend makes their first booking, we email you your reward." },
];

export default function ReferPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-5 pb-8 pt-14 sm:pt-20">
          <span className="inline-flex items-center rounded-[var(--radius-full)] bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-foreground">
            Referral
          </span>
          <h1 className="mt-4 font-serif text-4xl leading-[1.1] sm:text-6xl">Share Zennly. Get a free extra.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/80">
            Know someone who would love a calmer way to book self-care? Send them your link. When they make their first
            booking, you get a free extra at a participating studio.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-10">
          <ReferPanel />
        </section>

        <section className="mx-auto max-w-4xl px-5 py-8">
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

        <section className="mx-auto max-w-4xl px-5 py-8">
          <div
            className="rounded-[var(--radius-lg)] p-6 sm:p-8"
            style={{ background: "linear-gradient(135deg, #c4d0d4, #7f97a1)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/70">Your reward</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">A free extra at a participating studio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/80 sm:text-base">
              Something small and lovely added to a visit, chosen by Zennly. We email you the details after your
              friend&rsquo;s first booking.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-20 pt-8">
          <details className="group rounded-[var(--radius-lg)] border border-border bg-card p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              The small print
              <span aria-hidden className="text-muted-foreground transition-transform duration-150 group-open:rotate-45">
                +
              </span>
            </summary>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>The reward is a free extra at a participating studio, chosen by Zennly. It is not cash and cannot be exchanged for money.</li>
              <li>Your friend must be new to Zennly and sign up through your link. You earn one reward for each friend, on their first booking only.</li>
              <li>You cannot refer yourself. Fake accounts or bookings made to earn rewards will be refused.</li>
              <li>We send rewards by email to the address on your account, after we check the booking. This can take a few days.</li>
              <li>Zennly may change or end this offer at any time. Rewards already earned will still be honoured where we reasonably can.</li>
              <li>
                Questions: info@zennly.io. See also our <Link className="underline" href="/terms">Terms</Link> and{" "}
                <Link className="underline" href="/privacy">Privacy Policy</Link>.
              </li>
            </ul>
          </details>
        </section>
      </main>
      <Footer />
    </>
  );
}
