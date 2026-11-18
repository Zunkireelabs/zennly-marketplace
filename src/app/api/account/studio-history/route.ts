import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { prisma } from "@/lib/prisma";

/**
 * A logged-in customer's past/upcoming bookings and membership at one engine-connected studio —
 * fetched server-side from book-spa's marketplace-customer-lookup Edge Function. Additive to the
 * studio page, never load-bearing: any failure here (not logged in, provider not connected, no
 * email on file, book-spa down/slow/unknown) returns the same calm "not found" shape rather than
 * an error, so the page never breaks over this.
 *
 * Security model: book-spa trusts us to only ask about emails we've actually verified, so the
 * email here comes from getSessionUser() (checked against the auth server) and NEVER from the
 * request body — a client-supplied email would let anyone read anyone else's booking history.
 * Same reasoning for org_slug: resolved server-side from our own providers table by the public
 * provider slug the client sends, never taken from the client directly.
 */

const emptyResult = { found: false as const, bookings: [], membership: null, packages: [] };

const Body = z.object({ providerSlug: z.string().min(1).max(200) });

const LOOKUP_TIMEOUT_MS = 6000;

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const email = user.email;
  if (!email) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

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
    if (!res.ok) return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object" || !("found" in json)) {
      return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });
    }
    const data = json as Record<string, unknown>;
    return NextResponse.json(
      {
        ok: true,
        data: {
          found: Boolean(data.found),
          bookings: Array.isArray(data.bookings) ? data.bookings : [],
          membership: data.membership && typeof data.membership === "object" ? data.membership : null,
          packages: Array.isArray(data.packages) ? data.packages : [],
        },
      },
      { headers: noStore }
    );
  } catch {
    // Network error, timeout, or book-spa down — fail soft, same shape as "nothing found".
    return NextResponse.json({ ok: true, data: emptyResult }, { headers: noStore });
  }
}
