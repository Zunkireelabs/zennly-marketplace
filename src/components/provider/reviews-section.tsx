"use client";

import { useState } from "react";
import type { Provider, ReviewTopic } from "@/lib/providers";
import { StarIcon } from "./icons";

const FILTERS: ("All" | ReviewTopic)[] = ["All", "Service", "Ambience", "Value", "Cleanliness"];

export function ReviewsSection({ provider }: { provider: Provider }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const reviews =
    filter === "All" ? provider.reviews : provider.reviews.filter((r) => r.topics.includes(filter));

  return (
    <section id="reviews" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Reviews</h2>

      <div className="mt-5 flex flex-col gap-6 rounded-[var(--radius-lg)] bg-muted/60 p-6 sm:flex-row sm:items-center">
        <div className="shrink-0">
          {provider.isNew ? (
            <p className="text-2xl font-semibold">New to Zennly</p>
          ) : (
            <>
              <p className="text-5xl font-semibold tabular-nums">{provider.rating.toFixed(1)}</p>
              <p className="mt-1 flex items-center gap-0.5 text-warning" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} width={14} height={14} />
                ))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{provider.reviewCount} reviews</p>
            </>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            What guests say
          </p>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed">
            {provider.reviewSummary || "No reviews yet."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((name) => {
          const active = name === filter;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(name)}
              className={`min-h-[36px] shrink-0 rounded-[var(--radius-full)] border px-4 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-muted text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No reviews mention this yet.</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <li key={`${review.author}-${review.when}`} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-muted text-sm font-semibold"
                >
                  {review.author
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{review.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {review.when} · {review.visit}
                  </p>
                </div>
                <p className="ml-auto flex items-center gap-1 text-sm font-semibold tabular-nums">
                  <StarIcon width={13} height={13} className="text-warning" />
                  {review.rating}
                </p>
              </div>
              <p className="text-sm leading-relaxed">{review.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
