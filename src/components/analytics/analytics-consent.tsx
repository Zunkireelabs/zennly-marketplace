"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Google Analytics for the marketplace, loaded only after the visitor accepts. It is the same tag
 * the /businesses pages carry (marketing/src/_includes/base.njk), so one property covers zennly.io.
 * Production only, like the marketing site. The choice is remembered in localStorage; if storage is
 * blocked the banner simply shows again next visit and nothing loads.
 */
const GA_ID = "G-6LYQRZY03B";
const KEY = "zennly-analytics-consent";

type Choice = "granted" | "denied" | null;

function readChoice(): Choice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function AnalyticsConsent() {
  // null until mounted, so server and first client render match (nothing shown, nothing loaded).
  const [choice, setChoice] = useState<Choice | undefined>(undefined);

  useEffect(() => {
    setChoice(readChoice());
  }, []);

  if (process.env.NODE_ENV !== "production" || choice === undefined) return null;

  function decide(next: "granted" | "denied") {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* stays for this visit only */
    }
    setChoice(next);
  }

  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}
      {choice === null && (
        <div
          role="region"
          aria-label="Cookies"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 text-sm shadow-[var(--shadow-modal)] sm:flex-row sm:items-center"
        >
          <p className="text-muted-foreground">
            We use Google Analytics cookies to see how Zennly is used. Nothing loads unless you accept.{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => decide("denied")}
              className="h-10 rounded-full border border-border px-4 font-semibold hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => decide("granted")}
              className="h-10 rounded-full bg-foreground px-4 font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
