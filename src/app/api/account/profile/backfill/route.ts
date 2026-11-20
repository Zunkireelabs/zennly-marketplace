import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { normalizeName, normalizePhone } from "@/lib/auth/normalize";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";

/**
 * Fills EMPTY profile fields from what a customer typed into a booking form, so they don't retype
 * their own details on every booking.
 *
 * ## Why this endpoint exists in this shape
 *
 * The booking itself still happens inside book-spa's form, served at /book/* through this app's
 * proxy — which makes it same-origin, so the browser sends this app's httpOnly session cookie
 * with the request. That is the whole trust model: the user id comes from `getSessionUser()`,
 * never from the body. book-spa is not vouching for anyone's identity here; the customer's own
 * browser is submitting the customer's own typed data to their own profile.
 *
 * This is deliberately a stopgap. Once booking moves into the marketplace (Phase 1 of
 * docs/booking-migration-plan.md), the confirm handler will have both the verified user and the
 * typed values in the same request and can call the same logic directly, with no endpoint and no
 * cross-frame hop. Written to be deleted.
 *
 * ## Fill-empty-only, enforced in SQL
 *
 * COALESCE in a single UPDATE rather than read-then-write: it is race-free, and it makes "never
 * overwrite what the customer chose" a property of the statement rather than of careful code
 * somebody might later refactor. A customer who shortened their name to "Ani" must not have it
 * rewritten to "Anish" by their next booking.
 *
 * The known limitation, accepted rather than hidden: a field the customer deliberately CLEARED is
 * indistinguishable from one never set, so it can be refilled by a later booking. Fixing that
 * properly needs per-field touched-timestamps, which is more machinery than this stopgap earns.
 */
const Body = z.object({
  firstName: z.string().max(200).optional(),
  lastName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  dialCode: z.string().max(10).optional(),
  gender: z.string().max(20).optional(),
});

const GENDERS = new Set(["male", "female", "other"]);

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  // Not signed in is the common case, not an error: most people booking through /book/* have no
  // marketplace account at all. Answer 200 so book-spa's fire-and-forget call doesn't log noise.
  if (!user || !prisma) return NextResponse.json({ ok: true, data: { filled: false } }, { headers: noStore });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: true, data: { filled: false } }, { headers: noStore });

  const firstName = body.data.firstName ? normalizeName(body.data.firstName) : null;
  const lastName = body.data.lastName ? normalizeName(body.data.lastName) : null;
  const phone =
    body.data.phone && body.data.dialCode ? normalizePhone(body.data.dialCode, body.data.phone) : null;
  const gender =
    body.data.gender && GENDERS.has(body.data.gender.toLowerCase()) ? body.data.gender.toLowerCase() : null;

  if (!firstName && !lastName && !phone && !gender) {
    return NextResponse.json({ ok: true, data: { filled: false } }, { headers: noStore });
  }

  try {
    // `name` is only recomputed when it is itself empty AND at least one name part is arriving —
    // it must never be rebuilt from a half-filled row, which would blank a surname the customer
    // already had.
    await prisma.$executeRaw`
      UPDATE profiles SET
        first_name = COALESCE(first_name, ${firstName}),
        last_name  = COALESCE(last_name,  ${lastName}),
        phone      = COALESCE(phone,      ${phone}),
        gender     = COALESCE(gender,     ${gender}),
        name       = COALESCE(name, NULLIF(TRIM(
                       COALESCE(first_name, ${firstName}, '') || ' ' ||
                       COALESCE(last_name,  ${lastName},  '')
                     ), ''))
      WHERE id = ${user.id}::uuid
    `;

    // The Consent table's first writer. Copying details typed for one studio into a profile that
    // follows the customer across every studio is defensible and still feels like a violation when
    // discovered — so it leaves a record, rather than only happening.
    await prisma.consent.create({
      data: { userId: user.id, purpose: "profile_backfill_from_booking", granted: true, source: "booking_confirm" },
    });
  } catch {
    // Never surfaced: the booking already succeeded by the time this runs, and a profile that
    // didn't auto-fill is a minor inconvenience where an error on a completed booking is alarming.
    return NextResponse.json({ ok: true, data: { filled: false } }, { headers: noStore });
  }

  return NextResponse.json({ ok: true, data: { filled: true } }, { headers: noStore });
}
