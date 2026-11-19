import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { prisma } from "@/lib/prisma";

/**
 * A logged-in customer's past/upcoming bookings and membership at one or more engine-connected
 * studios — fetched server-side from book-spa's marketplace-customer-lookup Edge Function.
 * Additive, never load-bearing: any failure here (not logged in, provider not connected, no
 * email on file, book-spa down/slow/unknown) returns the same calm "not found" shape rather than
 * an error, so neither the studio page nor the profile page ever breaks over this.
 *
 * Two request shapes:
 *   { providerSlug: string }    single studio (the storefront page's "Your visits here" section)
 *   { providerSlugs: string[] } several studios at once (the cross-studio profile page) —
 *     fanned out in parallel server-side so the client makes one request, not N, and returns a
 *     map keyed by the SAME slugs passed in, with the same empty shape for any slug that isn't
 *     connected or that book-spa had nothing for.
 *
 * Security model: book-spa trusts us to only ask about emails we've actually verified, so the
 * email here comes from getSessionUser() (checked against the auth server) and NEVER from the
 * request body — a client-supplied email would let anyone read anyone else's booking history.
 * Same reasoning for org_slug: resolved server-side from our own providers table by the public
 * provider slug(s) the client sends, never taken from the client directly.
 */

const emptyResult = { found: false as const, bookings: [], membership: null, packages: [] };

const Body = z.union([
  z.object({ providerSlug: z.string().min(1).max(200) }),
  z.object({ providerSlugs: z.array(z.string().min(1).max(200)).min(1).max(50) }),
]);

const LOOKUP_TIMEOUT_MS = 6000;

async function lookupOne(orgSlug: string, email: string, functionsUrl: string, secret: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    const res = await fetch(`${functionsUrl}/marketplace-customer-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ org_slug: orgSlug, email }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    // 404 means the org is unknown or not marketplace-enabled to book-spa; 401 means our secret
    // is wrong. Neither is the customer's problem — both fall through to the calm empty state.
    if (!res.ok) return emptyResult;

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object" || !("found" in json)) return emptyResult;
    const data = json as Record<string, unknown>;
    return {
      found: Boolean(data.found),
      bookings: Array.isArray(data.bookings) ? data.bookings : [],
      membership: data.membership && typeof data.membership === "object" ? data.membership : null,
      packages: Array.isArray(data.packages) ? data.packages : [],
    };
  } catch {
    // Network error, timeout, or book-spa down — fail soft, same shape as "nothing found".
    return emptyResult;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const email = user.email;
  const body = Body.safeParse(await request.json().catch(() => null));

  if (!body.success) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  // Multi-studio shape: resolve every requested slug to its book-spa org slug (unconnected or
  // unknown slugs just come back empty, same as the single-studio path below), then fan out.
  if ("providerSlugs" in body.data) {
    const slugs = body.data.providerSlugs;
    const emptyMap = Object.fromEntries(slugs.map((s) => [s, emptyResult]));
    if (!email || !prisma) return NextResponse.json({ ok: true, data: emptyMap }, { headers: noStore });

    const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
    const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;
    if (!functionsUrl || !secret) return NextResponse.json({ ok: true, data: emptyMap }, { headers: noStore });

    const providers = await prisma.provider.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, engineProviderId: true },
    });
    const orgSlugBySlug = new Map(providers.map((p) => [p.slug, p.engineProviderId]));

    const entries = await Promise.all(
      slugs.map(async (slug) => {
        const orgSlug = orgSlugBySlug.get(slug);
        if (!orgSlug) return [slug, emptyResult] as const;
        return [slug, await lookupOne(orgSlug, email, functionsUrl, secret)] as const;
      })
    );
    return NextResponse.json({ ok: true, data: Object.fromEntries(entries) }, { headers: noStore });
  }

  // Single-studio shape, unchanged.
  if (!email) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });
  if (!prisma) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });
  const provider = await prisma.provider.findUnique({
    where: { slug: body.data.providerSlug },
    select: { engineProviderId: true },
  });
  const orgSlug = provider?.engineProviderId;
  if (!orgSlug) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
  const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;
  if (!functionsUrl || !secret) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const result = await lookupOne(orgSlug, email, functionsUrl, secret);
  return NextResponse.json({ ok: true, data: result }, { headers: noStore });
}
