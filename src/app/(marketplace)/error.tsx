"use client";

import Link from "next/link";
import { useEffect } from "react";
import { pillClass } from "@/components/ui/pill";

// This Next.js version passes `retry` (not `reset`) to error boundaries.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 py-24 text-center">
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">We hit a problem loading this page. Please try again.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={pillClass({ selected: true })}>
          Try again
        </button>
        <Link href="/" className={pillClass()}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
