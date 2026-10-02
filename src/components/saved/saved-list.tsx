"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ListingRow, type CollectionItem } from "@/components/collection/listing-row";
import { useAuth } from "@/lib/auth/auth-provider";
import { useSavedEntries } from "@/lib/saved/use-saved";

export function SavedList({ items }: { items: CollectionItem[] }) {
  const entries = useSavedEntries();
  const { user, ready, openLogin } = useAuth();

  // Newest save first. Slugs that no longer exist are simply not shown.
  const saved = useMemo(() => {
    const bySlug = new Map(items.map((i) => [i.slug, i]));
    return entries.flatMap((e) => bySlug.get(e.slug) ?? []);
  }, [entries, items]);

  return (
    <section className="pt-6" aria-labelledby="saved-heading">
      <h1 id="saved-heading" className="text-3xl font-semibold leading-tight sm:text-4xl">
        Saved studios
      </h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        {ready && !user
          ? "These are saved on this device. Log in to keep them on every device."
          : "Studios you've saved, newest first."}
      </p>

      {ready && !user && saved.length > 0 && (
        <button
          type="button"
          onClick={() => openLogin("save")}
          className="mt-4 h-11 rounded-[var(--radius-md)] border border-border px-5 text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Log in to keep these
        </button>
      )}

      {saved.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tap the heart on a studio to keep it here for later.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Explore studios
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {saved.map((item) => (
            <li key={item.slug}>
              <ListingRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
