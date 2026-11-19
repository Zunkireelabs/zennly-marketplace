import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureProfile, getAuthUser } from "@/lib/account/server";
import { normalizeCode, normalizeEmail } from "@/lib/auth/normalize";
import { fail, isSameOriginJson, noStore, notConfigured, ok } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().max(254), code: z.string().max(12) });

/** Checks the emailed code and, if right, starts the session (httpOnly cookie set by the server client). */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const supabase = await createSupabaseServer();
  if (!supabase) return notConfigured();

  const body = Body.safeParse(await request.json().catch(() => null));
  const email = body.success ? normalizeEmail(body.data.email) : null;
  const token = body.success ? normalizeCode(body.data.code) : null;
  if (!email || !token) return fail({ code: "invalid_input", message: "Enter the 6-digit code." }, 400);

  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    if (error?.status === 429) {
      return fail({ code: "locked", message: "Too many attempts. Try again soon.", retryAfterMs: 60_000 }, 429);
    }
    if (error?.code === "otp_expired") {
      return fail({ code: "expired", message: "That code has expired. Get a new one." }, 400);
    }
    return fail({ code: "invalid_code", message: "That code isn't right." }, 400);
  }
  await ensureProfile(data.user);
  return ok(await getAuthUser(data.user));
}
