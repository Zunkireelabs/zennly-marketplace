import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isValidSlug } from "@/lib/saved/store";
import { prisma } from "@/lib/prisma";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** The signed-in user's saved studios, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);
  const rows = await prisma.savedStudio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ ok: true, data: rows.map((r) => ({ slug: r.providerSlug, savedAt: r.createdAt.getTime() })) });
}

const Body = z.object({ slug: z.string().max(80), saved: z.boolean() });

/** Save or unsave one studio. */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return json({ ok: false }, 403);
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success || !isValidSlug(body.data.slug)) return json({ ok: false }, 400);
  const { slug, saved } = body.data;

  if (saved) {
    await prisma.savedStudio.upsert({
      where: { userId_providerSlug: { userId: user.id, providerSlug: slug } },
      create: { userId: user.id, providerSlug: slug },
      update: {},
    });
  } else {
    await prisma.savedStudio.deleteMany({ where: { userId: user.id, providerSlug: slug } });
  }
  return json({ ok: true });
}
