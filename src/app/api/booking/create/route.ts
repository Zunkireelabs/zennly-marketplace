import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { prisma } from "@/lib/prisma";
import { engineId } from "@/lib/booking/engine-id";
import { getStudioStatus } from "@/lib/booking/studio-status";

/**
 * Creates a real solo booking at an engine-connected studio, server-side, by calling book-spa's
 * marketplace-create-booking Edge Function (which itself calls public_create_booking,
 * migration-335). Group booking is out of scope here — see docs/booking-migration-plan.md.
 *
 * Security model mirrors studio-history/route.ts: the customer's email is never taken from the
 * request body — it's always the session's own verified email, exactly as book-spa trusts us to
 * only vouch for identities we've actually verified. BOOK_SPA_MARKETPLACE_SECRET lives only on
 * the server; it is never sent to the client and book-spa's service role key never reaches us.
 */

const Body = z.object({
  providerSlug: z.string().min(1).max(200),
  branchId: engineId,
  serviceId: engineId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(1).max(50),
  specialRequests: z.string().max(2000).nullish(),
  clientRequestId: z.string().uuid(),
});

const CREATE_TIMEOUT_MS = 10000;

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false, errorCode: "FORBIDDEN" }, { status: 403, headers: noStore });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, errorCode: "UNAUTHENTICATED" }, { status: 401, headers: noStore });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errorCode: "INVALID_REQUEST", message: "Missing or invalid booking details." }, { status: 400, headers: noStore });
  }
  const body = parsed.data;

  const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
  const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;
  if (!prisma || !functionsUrl || !secret) {
    return NextResponse.json(
      { ok: false, errorCode: "SERVER_MISCONFIGURED", message: "Booking is temporarily unavailable." },
      { status: 503, headers: noStore }
    );
  }

  const provider = await prisma.provider.findUnique({
    where: { slug: body.providerSlug },
    select: { engineProviderId: true },
  });
  const orgSlug = provider?.engineProviderId;
  // getSessionUser() returns the raw Supabase User — gender lives in our own Profile row
  // (prisma/schema.prisma), not on that object, so it needs its own lookup, same as
  // getAuthUser()'s profile read. Shaped to match p_customer_gender with no mapping on purpose.
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { gender: true } }).catch(() => null);
  if (!orgSlug) {
    return NextResponse.json(
      { ok: false, errorCode: "ORG_NOT_ENABLED", message: "This business isn't connected for online booking." },
      { status: 200, headers: noStore }
    );
  }

  // Only a live studio takes bookings. Checked here as well as on the pages, because a customer
  // can have a booking page open when the studio is switched off. Nothing is sent to bookX.
  const studio = await getStudioStatus(orgSlug);
  if (studio.status !== "live") {
    return NextResponse.json(
      { ok: false, errorCode: studio.status === "error" ? "BOOKING_UNAVAILABLE" : "BOOKING_NOT_LIVE" },
      { status: 200, headers: noStore }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);
    const res = await fetch(`${functionsUrl}/marketplace-create-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        org_slug: orgSlug,
        branch_id: body.branchId,
        service_id: body.serviceId,
        date: body.date,
        start_time: body.startTime,
        customer: {
          full_name: body.customerName,
          email: user.email ?? null,
          phone: body.customerPhone,
          gender: profile?.gender ?? null,
        },
        special_requests: body.specialRequests ?? null,
        // The drawer has no gender-preference picker yet (engine-availability.ts's
        // computeSoloSlots is always called with "no-preference") and no therapist/professional
        // picker at all — both are a later step's UI, not something to fabricate here. Passing
        // null keeps this consistent with what availability was actually computed against.
        gender_preference: null,
        therapist_ids: null,
        idempotency_key: body.clientRequestId,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object" || !("success" in json)) {
      return NextResponse.json(
        { ok: false, errorCode: "UNEXPECTED_ERROR", message: "Something went wrong creating the booking." },
        { status: 200, headers: noStore }
      );
    }

    const data = json as { success: boolean; error_code?: string; message?: string; booking?: Record<string, unknown> };
    if (data.success) {
      return NextResponse.json({ ok: true, booking: data.booking }, { headers: noStore });
    }
    return NextResponse.json(
      { ok: false, errorCode: data.error_code ?? "UNEXPECTED_ERROR", message: data.message },
      { status: 200, headers: noStore }
    );
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "UNREACHABLE", message: "Could not reach the booking system. Please try again." },
      { status: 200, headers: noStore }
    );
  }
}
