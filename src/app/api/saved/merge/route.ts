import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { isValidSlug } from "@/lib/saved/store";
import { prisma } from "@/lib/prisma";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

const Body = z.object({
  entries: z.array(z.object({ slug: z.string().max(80), savedAt: z.number().int().nonnegative() })).max(200),
});

/**
 * First sign-in on a device: add the device's saved studios to the account (union, never removes
 * anything), then return the account's full list, which becomes the source of truth on the device.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return json({ ok: false }, 403);
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ ok: false }, 400);

  const now = Date.now();
  const rows = body.data.entries
    .filter((e) => isValidSlug(e.slug))
    // A device clock cannot claim a save from the future.
    .map((e) => ({ userId: user.id, providerSlug: e.slug, createdAt: new Date(Math.min(e.savedAt, now)) }));
  if (rows.length) await prisma.savedStudio.createMany({ data: rows, skipDuplicates: true });

  const all = await prisma.savedStudio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ ok: true, data: all.map((r) => ({ slug: r.providerSlug, savedAt: r.createdAt.getTime() })) });
}
