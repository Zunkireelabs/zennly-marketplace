"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-provider";
import { pillClass } from "@/components/ui/pill";

type Summary = { code: string; signedUp: number; booked: number; rewardsDue: number; rewardsSent: number };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

/** The signed-in part of /refer: the person's own link and how their invites are going. */
export function ReferPanel() {
  const { user, ready, openLogin } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    fetch("/api/referral")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((s: Summary) => !cancelled && setSummary(s))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready) return <div className="h-40 rounded-[var(--radius-lg)] border border-border bg-card" aria-hidden />;

  if (!user) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Get your invite link</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in and your personal link appears here.</p>
        <button type="button" onClick={() => openLogin("login")} className={`${pillClass({ selected: true })} mt-4`}>
          Sign in
        </button>
      </div>
    );
  }

  if (failed) {
    return <p className="rounded-[var(--radius-lg)] border border-border bg-card p-6 text-sm text-muted-foreground">We couldn&rsquo;t load your link just now. Please try again in a moment.</p>;
  }
  if (!summary) return <div className="h-40 rounded-[var(--radius-lg)] border border-border bg-card" aria-hidden />;

  const link = `${SITE || window.location.origin}/?ref=${summary.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it.");
    }
  }
  async function share() {
    try {
      await navigator.share({ title: "Zennly", text: "Find and book spas, salons and wellness studios on Zennly.", url: link });
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Your invite link</h2>
        <p className="mt-2 break-all rounded-[var(--radius-md)] bg-muted px-4 py-3 font-mono text-sm">{link}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => void copy()} className={pillClass({ selected: true })}>
            Copy link
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button type="button" onClick={() => void share()} className={pillClass()}>
              Share
            </button>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Friends who joined", summary.signedUp],
          ["Made a first booking", summary.booked],
          ["Rewards to send", summary.rewardsDue],
          ["Rewards sent", summary.rewardsSent],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-[var(--radius-md)] border border-border p-3">
            <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
            <dt className="mt-0.5 text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
