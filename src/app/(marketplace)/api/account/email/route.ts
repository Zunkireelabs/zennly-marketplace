import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { maskTarget, normalizeEmail } from "@/lib/auth/normalize";
import { fail, isSameOriginJson, noStore, notConfigured, ok } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().max(254) });

/**
 * Starts an email change. Does NOT change anything yet — Supabase parks the new address on
 * `auth.users.new_email` and emails a code to BOTH addresses ("Secure email change" is ON for this
 * project, confirmed 2026-11-20). The change lands only when both codes are verified, in
 * ./verify/route.ts.
 *
 * Why both: these customers have no password, so there is nothing to re-authenticate with. Google
 * and Apple can afford to merely *notify* the old address because they already made you prove
 * yourself with a password first; we can't. The code to the current address is that step. Without
 * it, anyone reaching a logged-in session moves the email to their own, confirms it from their own
 * inbox, and the real customer is never told — losing the login, the recovery path, and their
 * cross-studio booking history at once.
 *
 * Verifying the NEW address is separately non-negotiable and is not a security measure: it's typo
 * protection. "@zenly.io" for "@zennly.io" moves the login to an address nobody owns, with no way
 * back.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });

  const supabase = await createSupabaseServer();
  if (!supabase) return notConfigured();

  const body = Body.safeParse(await request.json().catch(() => null));
  const email = body.success ? normalizeEmail(body.data.email) : null;
  if (!email) return fail({ code: "invalid_input", message: "Enter a valid email address." }, 400);

  if (user.email && email === user.email.toLowerCase()) {
    return fail({ code: "invalid_input", message: "That's already your email address." }, 400);
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    // Supabase rate-limits outbound auth email per project. We lean on that rather than keeping
    // our own counter: an app-level throttle would need shared state to be worth anything (a
    // per-instance Map is defeated by a second instance), and GoTrue's limit is the one that
    // actually governs whether a mail is sent.
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return fail(
        { code: "cooldown", message: "Too many attempts. Try again in a minute.", retryAfterMs: 60_000 },
        429
      );
    }
    // email_exists / user_already_exists: the address belongs to another account. Deliberately the
    // same wording as a malformed address — confirming "that address has an account here" to
    // anyone who can reach this endpoint is an account-enumeration oracle, and the customer who
    // genuinely owns both addresses is not the person we're protecting against.
    return fail({ code: "invalid_input", message: "We can't use that address. Try another." }, 400);
  }

  // Masked, so the dialog can name both inboxes without the page ever rendering a full address it
  // was not already showing.
  return ok({
    newEmail: maskTarget("email", email),
    currentEmail: user.email ? maskTarget("email", user.email) : null,
  });
}
