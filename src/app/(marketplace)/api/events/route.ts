import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { isSameOriginJson } from "@/lib/supabase/api";

const EVENTS = [
  "provider_viewed",
  "search_run",
  "studio_saved",
  "studio_unsaved",
  "book_clicked",
  "handoff_started",
  "login_started",
  "login_completed",
] as const;

const ALLOWED_PROPS = new Set(["slug", "method", "reason", "for_whom", "service_count", "has_query", "destination"]);

const Body = z.object({
  event: z.enum(EVENTS),
  anonId: z.string().uuid(),
  props: z.record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()])).default({}),
});

const done = () => new NextResponse(null, { status: 204 });

/** Activity sink. Never errors to the page: analytics must not break anything. */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request) || !prisma) return done();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return done();

  // Re-apply the allowlist here: the client's copy is a convenience, this one is the guarantee.
  const props = Object.fromEntries(Object.entries(body.data.props).filter(([k]) => ALLOWED_PROPS.has(k)));
  const slug = typeof props.slug === "string" ? props.slug : null;
  const user = await getSessionUser();
  await prisma.event
    .create({ data: { userId: user?.id ?? null, anonId: body.data.anonId, event: body.data.event, providerSlug: slug, props } })
    .catch(() => {});
  return done();
}
