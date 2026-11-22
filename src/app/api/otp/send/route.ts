import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { isValidEmailFormat } from "@/lib/work-email";
import { limited, makeToken, OTP_TTL_MS, OTP_SECRET_CONFIGURED } from "@/lib/otp-store";
import { sendOtpEmail, SITE_URL, OTP_MISCONFIGURED_IN_PROD } from "@/lib/otp-email";

/**
 * Ported from otp-service/server.js's POST /send (docs/marketing/retired-deploy-config/
 * otp-service) — the standalone container nginx used to proxy /api/otp/ to, before the
 * marketing site and this app merged. Same stateless design: the code itself is never stored,
 * only a signed token (expiry + HMAC) is handed back for /verify to recompute.
 *
 * isSameOriginJson replaces server.js's manual CORS-for-localhost branch: that existed only
 * because otp-service ran on a different port than the Eleventy dev server. Now the trial
 * modal always fetches a root-relative '/api/otp/...', so every real call — dev or prod — is
 * already same-origin; the CORS branch had nothing left to do.
 */

// SMS codes aren't wired yet (EdgeX integration, same as server.js) — answered honestly rather
// than silently accepted and never delivered.
const PHONE_FORMAT = /^\+?\d{8,15}$/;

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  if (!OTP_SECRET_CONFIGURED) {
    console.error("OTP_SECRET is not configured");
    return NextResponse.json({ error: "server-misconfigured" }, { status: 500, headers: noStore });
  }
  // server.js refused to even start in production without RESEND_API_KEY, rather than silently
  // falling back to logging the code where nobody would see it. Same refusal here, at request
  // time instead of boot time — see otp-email.ts's comment on OTP_MISCONFIGURED_IN_PROD.
  if (OTP_MISCONFIGURED_IN_PROD) {
    console.error("RESEND_API_KEY is not configured in production");
    return NextResponse.json({ error: "server-misconfigured" }, { status: 500, headers: noStore });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad-request" }, { status: 400, headers: noStore });

  const email = String((body as Record<string, unknown>).email || "").trim().toLowerCase();
  const phone = String((body as Record<string, unknown>).phone || "").replace(/[^\d+]/g, "");
  const name = String((body as Record<string, unknown>).name || "");
  const viaSms = !email && Boolean(phone);

  const ip = clientIp(request);

  if (viaSms) {
    if (!PHONE_FORMAT.test(phone)) return NextResponse.json({ error: "invalid-phone" }, { status: 400, headers: noStore });
    return NextResponse.json({ error: "sms-unavailable" }, { status: 501, headers: noStore });
  }

  if (!isValidEmailFormat(email)) return NextResponse.json({ error: "invalid-email" }, { status: 400, headers: noStore });
  if (limited(`ip-send:${ip}`, 8, 10 * 60e3) || limited(`mail-send:${email}`, 5, 60 * 60e3)) {
    return NextResponse.json({ error: "too-many" }, { status: 429, headers: noStore });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const exp = Date.now() + OTP_TTL_MS;
  const token = makeToken(email, exp, code);
  const link = `${SITE_URL}/?dt=${token}&de=${encodeURIComponent(email)}&dc=${code}`;

  try {
    await sendOtpEmail(email, name, code, link);
  } catch (e) {
    console.error("send failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "send-failed" }, { status: 502, headers: noStore });
  }

  return NextResponse.json({ token }, { headers: noStore });
}

/**
 * This app sits behind Traefik only (no nginx in front of it, unlike otp-service's old
 * deployment) — one reverse-proxy hop, so the client is the FIRST entry in X-Forwarded-For, not
 * the 2nd-from-right server.js used for its own two-hop (traefik -> nginx) topology. Don't copy
 * that offset forward; it would silently bucket every request under the wrong key.
 */
function clientIp(request: NextRequest): string {
  const xff = (request.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[0] || "?";
}
