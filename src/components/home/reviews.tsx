import { platformReviews } from "@/lib/placeholder-data";

/**
 * "Reviews" — written, star-rated reviews FROM Zennly providers ABOUT the platform itself,
 * structurally adapted from Fresha's review-card grid (star row, headline quote, body,
 * reviewer identity), own copy per the reference principle. Sits directly below ProviderPitch
 * to substantiate its "Rated 5.0 by early providers" stat line, not a duplicate of
 * SocialProof's customer video-story carousel (different audience, different section) — see
 * placeholder-data.ts's platformReviews comment for the full reasoning.
 *
 * Title stays plain ("Reviews"), unlike the poetic section titles elsewhere on this page — for
 * SEO, a literal, keyword-matchable heading beats a clever phrase here.
 */
export function Reviews() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
        Reviews
      </h2>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {platformReviews.map((review) => (
          <article
            key={review.reviewerName}
            className="flex w-72 shrink-0 flex-col gap-4 rounded-[var(--radius-lg)] bg-muted p-6"
          >
            <span aria-hidden className="flex gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={i < review.rating ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M12 3l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6L12 3Z" />
                </svg>
              ))}
            </span>

            <div>
              <p className="text-sm font-semibold text-foreground">{review.headline}</p>
              <p className="mt-1.5 text-sm leading-[1.6] text-muted-foreground">{review.body}</p>
            </div>

            <div className="mt-auto flex items-center gap-3 pt-2">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-sm font-semibold text-white"
                style={{ background: review.tone }}
              >
                {review.initial}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {review.reviewerRole}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {review.reviewerLocation}
                </span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
