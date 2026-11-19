"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountMobileMenu } from "@/components/account/account-nav";

/**
 * Mobile: the section list (AccountShell's sidebar is lg:only, so this is the only way to reach
 * a section below that breakpoint). Desktop: the sidebar is already visible in the layout, so
 * landing here has nothing to show beside it — redirect straight to Profile, the natural default
 * section.
 *
 * The redirect is client-side and viewport-gated rather than unconditional: a mobile visitor
 * should see the list, not bounce through Profile and back. There's no server-side viewport
 * signal to redirect on instead.
 */
export default function AccountRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/account/profile");
    }
  }, [router]);

  return (
    <div className="lg:hidden">
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Your account</h1>
      <div className="mt-6">
        <AccountMobileMenu />
      </div>
    </div>
  );
}
