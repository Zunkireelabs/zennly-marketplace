import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { deriveDisplayName, getAuthUser, getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { COUNTRIES, normalizeName, normalizePhone } from "@/lib/auth/normalize";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/**
 * Deletes the signed-in user's account: marketplace rows first, then the auth user. Needs
 * SUPABASE_SERVICE_ROLE_KEY (server only, never NEXT_PUBLIC_). Bookings live in the engine and are
 * not touched here.
 */
export async function DELETE(request: NextRequest) {
  if (!isSameOriginJson(request)) return json({ ok: false }, 403);
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  const config = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!prisma || !config || !serviceKey) return json({ ok: false }, 503);

  await prisma.$transaction([
    prisma.savedStudio.deleteMany({ where: { userId: user.id } }),
    prisma.consent.deleteMany({ where: { userId: user.id } }),
    prisma.event.deleteMany({ where: { userId: user.id } }),
    prisma.profile.deleteMany({ where: { id: user.id } }),
  ]);

  const admin = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ ok: false }, 502);

  await (await createSupabaseServer())?.auth.signOut();
  return json({ ok: true });
}

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const GENDERS = new Set(["male", "female", "other"]);

// nullable().optional() on every field is load-bearing: it's what lets a Zod-parsed value
// distinguish "key absent from the payload" (parses to undefined — leave the field alone) from
// "key explicitly null" (parses to null — clear it). book-spa's update_customer_contact_info uses
// COALESCE(NULLIF(btrim(...),''), old), which makes a value impossible to erase; this must not
// repeat that bug, so every branch below checks `!== undefined` before touching the field at all.
const PatchBody = z.object({
  firstName: z.string().max(200).nullable().optional(),
  lastName: z.string().max(200).nullable().optional(),
  /** Raw national-format input, paired with dialCode — normalizePhone() builds the E.164 string
   * actually stored. Clearing the phone (phone: null) ignores dialCode entirely. */
  phone: z.string().max(40).nullable().optional(),
  dialCode: z.string().max(10).nullable().optional(),
  gender: z.string().nullable().optional(),
  country: z.string().max(2).nullable().optional(),
});

/**
 * Edits the signed-in user's own profile fields. Email is deliberately NOT accepted here — it's
 * the Supabase login identity, a verify-before-switch auth operation, not a profile field (see
 * the planned /api/account/email route).
 *
 * `phone` accepted here is self-asserted, unverified text — there is no SMS provider yet to prove
 * otherwise. It must never:
 *   - be passed to marketplace_lookup_customer, with identifier_kind 'phone' or any other kind —
 *     that would make a stranger's booking history readable by typing their number into this form,
 *     the exact leak the book-spa service secret exists to prevent;
 *   - set phoneVerifiedAt (this route never touches that column at all);
 *   - reach book-spa except as prefill in an editable field the customer reviews and submits
 *     themselves at booking time;
 *   - be treated as a login identifier — phone sign-in stays "Soon" (login-dialog.tsx) regardless
 *     of what's saved here.
 *
 * Whichever one of firstName/lastName changes this request, `name` (the derived display string
 * src/api/auth/me and book-spa's prefill both read) is recomputed from the FINAL pair — current DB
 * value for whichever of the two wasn't touched — via the same deriveDisplayName() ensureProfile
 * uses, so there is one place that owns "how firstName/lastName become a display name."
 *
 * Any invalid field rejects the WHOLE request rather than silently dropping it: normalizePhone
 * returns null for both "empty" and "invalid", so a silent drop would make a rejected Nepali
 * number look like a successful save of nothing.
 */
export async function PATCH(request: NextRequest) {
  if (!isSameOriginJson(request)) return json({ ok: false }, 403);
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);

  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);
  const body = parsed.data;

  const current = await prisma.profile.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true } });

  const data: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    gender?: string | null;
    country?: string | null;
    name?: string | null;
  } = {};

  if (body.firstName !== undefined) {
    if (body.firstName === null) data.firstName = null;
    else {
      const n = normalizeName(body.firstName);
      if (!n) return json({ ok: false, error: "invalid_input", field: "firstName" }, 400);
      data.firstName = n;
    }
  }

  if (body.lastName !== undefined) {
    if (body.lastName === null) data.lastName = null;
    else {
      const n = normalizeName(body.lastName);
      if (!n) return json({ ok: false, error: "invalid_input", field: "lastName" }, 400);
      data.lastName = n;
    }
  }

  if (body.firstName !== undefined || body.lastName !== undefined) {
    const finalFirst = body.firstName !== undefined ? data.firstName! : (current?.firstName ?? null);
    const finalLast = body.lastName !== undefined ? data.lastName! : (current?.lastName ?? null);
    data.name = deriveDisplayName(finalFirst, finalLast);
  }

  if (body.phone !== undefined) {
    if (body.phone === null) data.phone = null;
    else {
      if (body.dialCode === undefined || body.dialCode === null) {
        return json({ ok: false, error: "invalid_input", field: "phone" }, 400);
      }
      const e164 = normalizePhone(body.dialCode, body.phone);
      if (!e164) return json({ ok: false, error: "invalid_input", field: "phone" }, 400);
      data.phone = e164;
    }
  }

  if (body.gender !== undefined) {
    if (body.gender === null) data.gender = null;
    else {
      if (!GENDERS.has(body.gender)) return json({ ok: false, error: "invalid_input", field: "gender" }, 400);
      data.gender = body.gender;
    }
  }

  if (body.country !== undefined) {
    if (body.country === null) data.country = null;
    else {
      if (!COUNTRY_CODES.has(body.country)) return json({ ok: false, error: "invalid_input", field: "country" }, 400);
      data.country = body.country;
    }
  }

  await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, ...data },
    update: data,
  });

  return json({ ok: true, data: await getAuthUser(user) });
}
