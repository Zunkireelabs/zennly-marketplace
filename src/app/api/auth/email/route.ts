import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/normalize";
import { fail, isSameOriginJson, noStore, notConfigured, ok, safeNext } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().max(254), next: z.string().max(300).optional() });

/** Sends a 6-digit sign-in code to an email address (creates the account on first use). */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const supabase = await createSupabaseServer();
  if (!supabase) return notConfigured();

  const body = Body.safeParse(await request.json().catch(() => null));
  const email = body.success ? normalizeEmail(body.data.email) : null;
  if (!email) return fail({ code: "invalid_input", message: "Enter a valid email address." }, 400);

  // If the email template carries a link, it returns here and /auth/callback starts the session.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const next = safeNext(body.success ? (body.data.next ?? null) : null);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return fail({ code: "cooldown", message: "Too many requests. Try again in a minute.", retryAfterMs: 60_000 }, 429);
    }
    console.error("[auth/email] signInWithOtp failed:", error.status, error.code, error.message);
    return fail({ code: "unavailable", message: "We couldn't send the sign-in email. Try again." }, 502);
  }
  return ok({ kind: "email" as const, value: email });
}
