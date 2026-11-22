import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { isValidEmailFormat } from "@/lib/work-email";
import {
  limited,
  parseToken,
  isUsed,
  markUsed,
  attemptCount,
  recordFailedAttempt,
  sign,
  safeEq,
  OTP_SECRET_CONFIGURED,
} from "@/lib/otp-store";

/** Ported from otp-service/server.js's POST /verify. See send/route.ts for the shared context. */

const DEMO = {
  email: process.env.DEMO_LOGIN_EMAIL || "demo@gmail.com",
  password: process.env.DEMO_LOGIN_PASSWORD || "demo@123",
  loginUrl: process.env.DEMO_LOGIN_URL || "https://dev-app.zennly.io/demo/login",
};

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  if (!OTP_SECRET_CONFIGURED) {
    console.error("OTP_SECRET is not configured");
    return NextResponse.json({ error: "server-misconfigured" }, { status: 500, headers: noStore });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad-request" }, { status: 400, headers: noStore });

  const b = body as Record<string, unknown>;
  const email = String(b.email || "").trim().toLowerCase();
  const code = String(b.code || "");
  const token = String(b.token || "");
  const parsed = parseToken(token);

  if (!isValidEmailFormat(email) || !/^\d{6}$/.test(code) || !parsed) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: noStore });
  }
  const { exp, mac } = parsed;

  const ip = clientIp(request);
  if (limited(`ip-verify:${ip}`, 30, 10 * 60e3)) return NextResponse.json({ error: "too-many" }, { status: 429, headers: noStore });

  if (exp < Date.now()) return NextResponse.json({ error: "expired" }, { status: 400, headers: noStore });
  if (isUsed(token) || attemptCount(token) >= 5) return NextResponse.json({ error: "invalid-code" }, { status: 400, headers: noStore });

  if (!safeEq(mac, sign(email, exp, code))) {
    recordFailedAttempt(token, exp);
    return NextResponse.json({ error: "invalid-code" }, { status: 400, headers: noStore });
  }

  markUsed(token, exp); // one-time use
  return NextResponse.json(DEMO, { headers: noStore });
}

// Same reasoning as send/route.ts: one Traefik hop here, not server.js's traefik -> nginx two.
function clientIp(request: NextRequest): string {
  const xff = (request.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[0] || "?";
}
