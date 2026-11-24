import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser, getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { syncEmailToStudios } from "@/lib/account/contact-sync";
import { normalizeCode, normalizeEmail } from "@/lib/auth/normalize";
import { fail, isSameOriginJson, noStore, notConfigured, ok } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().max(254), code: z.string().max(12) });

/**
 * Verifies ONE of the two codes an email change requires. Called twice — once with the old
 * address and its code, once with the new address and its code. Order does not matter.
 *
 * ## The trap this route exists to not fall into
 *
 * The FIRST of the two verifications succeeds with an EMPTY payload:
 * `{ data: { user: null, session: null }, error: null }`. Not an error — a success carrying
 * nothing. This is explicit in @supabase/auth-js's own response transformer
 * (src/lib/fetch.ts:263-265: "Some /verify responses (e.g. secure email_change
 * first-confirmation) return only `{ msg, code }` with no user and no session"), and verified by
 * tracing verifyOtp() itself: `if (error) throw` doesn't fire, and `if (!data) throw` does NOT
 * catch it either, because `data` is the truthy object `{session: null, user: null}`. Nothing in
 * the SDK's own guards stops a caller treating the first leg as completion.
 *
 * book-spa's equivalent (CustomerAuthContext.jsx#confirmEmailChange) assumes success means done
 * and immediately syncs the email onward. Ported as-is, the first leg would sync the OLD,
 * unchanged address — silently wrong, no error anywhere. So: branch on `data.user`/`data.session`
 * being non-null. Only the completing leg means "changed".
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const supabase = await createSupabaseServer();
  if (!supabase) return notConfigured();

  const body = Body.safeParse(await request.json().catch(() => null));
  const email = body.success ? normalizeEmail(body.data.email) : null;
  const token = body.success ? normalizeCode(body.data.code) : null;
  if (!email || !token) return fail({ code: "invalid_input", message: "Enter the 6-digit code." }, 400);

  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email_change" });

  if (error) {
    if (error.status === 429) {
      return fail({ code: "locked", message: "Too many attempts. Try again soon.", retryAfterMs: 60_000 }, 429);
    }
    // GoTrue has no distinct wrong-code error — it conflates wrong and expired into otp_expired
    // (there is no otp_invalid in its ErrorCode enum). One combined message is the honest
    // rendering of what the server actually told us.
    return fail({ code: "invalid_code", message: "That code is wrong or has expired." }, 400);
  }

  // One leg down, one outstanding. The change has NOT happened: auth.users.email is unchanged and
  // new_email is still parked. Say so plainly rather than letting the UI celebrate.
  if (!data.user || !data.session) {
    return ok({ complete: false });
  }

  // Both legs in — the address has actually moved.
  const confirmed = data.user.email?.toLowerCase();
  if (confirmed && prisma) {
    // Record it as a verified factor so the cross-studio history fan-out keeps finding bookings
    // filed under it. The OLD address stays in the table on purpose: book-spa records are filed
    // under whatever address the customer used at the time, and dropping it would make their
    // history vanish at the moment they changed email — which is exactly what ProfileFactor
    // exists to prevent.
    await prisma.profileFactor
      .upsert({
        where: { userId_kind_value: { userId: data.user.id, kind: "email", value: confirmed } },
        create: { userId: data.user.id, kind: "email", value: confirmed, verifiedAt: new Date() },
        update: {},
      })
      .catch(() => {
        // Non-fatal: the change itself succeeded, and the session email is always queried
        // alongside stored factors, so history still resolves under the new address. Losing the
        // row only costs the OLD address's history until the next successful write.
      });
  }

  // Tell the studios, so staff stop writing to an address the customer no longer reads.
  // `sessionUser.email` was read at the top of this handler, BEFORE verifyOtp completed the
  // change, so it is still the old address here — `data.user.email` is the new one. Best-effort
  // by design: see syncEmailToStudios' doc comment for why a failure here can't cost the customer
  // anything (the history fan-out queries every verified factor, old addresses included).
  if (sessionUser.email && confirmed) {
    await syncEmailToStudios(sessionUser.email, confirmed).catch(() => {});
  }

  // Sign out everywhere else. This is the point of requiring the old address's code at all: the
  // reason someone changes their email urgently is that their account was taken over, and without
  // this the attacker's session on another device survives the recovery untouched. `others` keeps
  // the session in the tab doing the work — a global sign-out would log the customer out of the
  // very page they're on, mid-flow, which reads as a failure.
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});

  return ok({ complete: true, user: await getAuthUser(data.user) });
}
