import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { prisma } from "@/lib/prisma";
import { mergeLookupResults, type LookupResult } from "@/lib/account/studio-lookup";

/**
 * A logged-in customer's past/upcoming bookings and membership at one or more engine-connected
 * studios — fetched server-side from book-spa's marketplace-customer-lookup Edge Function.
 * Additive, never load-bearing: any failure here (not logged in, provider not connected, no
 * verified email on file, book-spa down/slow/unknown) returns the same calm "not found" shape
 * rather than an error, so neither the studio page nor the profile page ever breaks over this.
 *
 * Two request shapes:
 *   { providerSlug: string }    single studio (the storefront page's "Your visits here" section)
 *   { providerSlugs: string[] } several studios at once (the cross-studio profile page) —
 *     fanned out in parallel server-side so the client makes one request, not N, and returns a
 *     map keyed by the SAME slugs passed in, with the same empty shape for any slug that isn't
 *     connected or that book-spa had nothing for.
 *
 * Fans out over EVERY verified email (ProfileFactor, kind:'email'), not just the current session
 * email, and merges per org — this is what keeps a customer's history intact across an email
 * change (see src/lib/account/studio-lookup.ts#mergeLookupResults for the merge rule; dedup,
 * membership-conflict handling, and the 10-factor cap all live there, not here). BOTH call sites
 * below fan out over factors identically — fixing only one would leave the studio page silently
 * losing history after an email change while /account kept it, a discrepancy that would read as a
 * provider-page bug and get hunted in the wrong place.
 *
 * Security model: book-spa trusts us to only ask about emails we've actually verified, so the
 * emails here come from getSessionUser() + ProfileFactor (never the request body — a
 * client-supplied email would let anyone read anyone else's booking history). Same reasoning for
 * org_slug: resolved server-side from our own providers table by the public provider slug(s) the
 * client sends, never taken from the client directly.
 */

const emptyResult: LookupResult = {
  found: false,
  bookings: [],
  membership: null,
  packages: [],
  vouchers: [],
  totalVisits: 0,
  referralEarnings: 0,
};

const Body = z.union([
  z.object({ providerSlug: z.string().min(1).max(200) }),
  z.object({ providerSlugs: z.array(z.string().min(1).max(200)).min(1).max(50) }),
]);

const LOOKUP_TIMEOUT_MS = 6000;
const MAX_FACTORS = 10;

async function lookupOne(orgSlug: string, email: string, functionsUrl: string, secret: string): Promise<LookupResult> {
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
      membership: data.membership && typeof data.membership === "object" ? (data.membership as Record<string, unknown>) : null,
      packages: Array.isArray(data.packages) ? data.packages : [],
      // Added in migration-336 alongside bookings/membership/packages — previously parsed off this
      // object and then dropped before the function returned, which is the same "compiles, runs,
      // delivers nothing" failure shape as the field-name bug in bookingLine().
      vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
      totalVisits: typeof data.total_visits === "number" ? data.total_visits : 0,
      referralEarnings: typeof data.referral_earnings === "number" ? data.referral_earnings : 0,
    };
  } catch {
    // Network error, timeout, or book-spa down — fail soft, same shape as "nothing found".
    return emptyResult;
  }
}

/** Every verified email for this user, session email first (so it wins membership ties in
 * mergeLookupResults), then other verified factors oldest-first, deduped, capped at MAX_FACTORS —
 * bounding the slugs × emails product, same reasoning as the existing 50-slug cap: so it's
 * bounded, not because anyone will reach it. */
async function verifiedEmails(userId: string, sessionEmail: string | undefined): Promise<string[]> {
  if (!prisma) return sessionEmail ? [sessionEmail] : [];
  const factors = await prisma.profileFactor.findMany({
    where: { userId, kind: "email" },
    orderBy: { verifiedAt: "asc" },
    select: { value: true },
  });
  const ordered = sessionEmail ? [sessionEmail, ...factors.map((f) => f.value)] : factors.map((f) => f.value);
  return Array.from(new Set(ordered)).slice(0, MAX_FACTORS);
}

async function lookupOrgAcrossEmails(
  orgSlug: string,
  emails: string[],
  functionsUrl: string,
  secret: string,
  context: { orgSlug: string; userId: string }
): Promise<LookupResult> {
  const results = await Promise.all(emails.map((email) => lookupOne(orgSlug, email, functionsUrl, secret)));
  return mergeLookupResults(results, context);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
  const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;

  // Multi-studio shape: resolve every requested slug to its book-spa org slug (unconnected or
  // unknown slugs just come back empty, same as the single-studio path below), then fan out.
  if ("providerSlugs" in body.data) {
    const slugs = body.data.providerSlugs;
    const emptyMap = Object.fromEntries(slugs.map((s) => [s, emptyResult]));
    if (!prisma || !functionsUrl || !secret) return NextResponse.json({ ok: true, data: emptyMap }, { headers: noStore });

    // Unreachable by construction for an existing account — the ProfileFactor migration seeded
    // one row per confirmed signup email, and ensureProfile never runs without one — but falling
    // through to the calm empty shape here is correct even if it somehow is reached: it's the
    // exact same "nothing found" a customer with no history gets, not an error. Left as a safe
    // fallback rather than a throw on purpose; don't "fix" it into one.
    const emails = await verifiedEmails(user.id, user.email);
    if (emails.length === 0) return NextResponse.json({ ok: true, data: emptyMap }, { headers: noStore });

    const providers = await prisma.provider.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, engineProviderId: true },
    });
    const orgSlugBySlug = new Map(providers.map((p) => [p.slug, p.engineProviderId]));

    const entries = await Promise.all(
      slugs.map(async (slug) => {
        const orgSlug = orgSlugBySlug.get(slug);
        if (!orgSlug) return [slug, emptyResult] as const;
        return [slug, await lookupOrgAcrossEmails(orgSlug, emails, functionsUrl, secret, { orgSlug, userId: user.id })] as const;
      })
    );
    return NextResponse.json({ ok: true, data: Object.fromEntries(entries) }, { headers: noStore });
  }

  // Single-studio shape — same factor fan-out as above, just for one slug.
  if (!prisma || !functionsUrl || !secret) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });
  const provider = await prisma.provider.findUnique({
    where: { slug: body.data.providerSlug },
    select: { engineProviderId: true },
  });
  const orgSlug = provider?.engineProviderId;
  if (!orgSlug) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const emails = await verifiedEmails(user.id, user.email);
  if (emails.length === 0) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const result = await lookupOrgAcrossEmails(orgSlug, emails, functionsUrl, secret, { orgSlug, userId: user.id });
  return NextResponse.json({ ok: true, data: result }, { headers: noStore });
}
