import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser, getSessionUser } from "@/lib/account/server";
import { isSameOrigin, noStore } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AvatarImageError, MAX_RAW_BYTES, processAvatarImage, sniffImageFormat } from "@/lib/account/avatar-image";
import { AVATAR_BUCKET, avatarPublicUrl, avatarStoragePath, newAvatarPath } from "@/lib/account/avatar-upload";

/**
 * Upload (POST) and clear (DELETE) the customer's OWN avatar photo. Writes profiles.avatarUploaded
 * ONLY — ensureProfile() owns avatarProvider exclusively, and this route never touches it, for the
 * same reason ensureProfile never touches avatarUploaded: an upload must never be overwritten by a
 * later sign-in, and a sign-in must never be able to erase an upload. See schema.prisma's doc
 * comment on Profile.avatarUploaded for the full reasoning.
 *
 * The actual storage write goes through a SESSION-SCOPED client (createSupabaseServer(), the same
 * cookie-based client getSessionUser() uses), not a service-role/admin client — so the owner-prefix
 * restriction in the "avatars" bucket's RLS policies (migration 20261119130000) is the thing that
 * actually enforces "you can only write into your own folder", not application code alone. A bug
 * in the code below that let someone pass another user's id would still be refused by Postgres.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ ok: false }, 403);

  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);

  const supabase = await createSupabaseServer();
  if (!supabase) return json({ ok: false }, 503);

  // Cheap pre-parse rejection for an obviously-too-large declared size. Not the real guard — a
  // client can lie about Content-Length — but avoids buffering a multi-hundred-MB body into
  // memory just to reject it a moment later. The REAL cap is MAX_RAW_BYTES inside
  // processAvatarImage, checked against the bytes actually received, before sharp decodes
  // anything (the pre-decode guard against a decompression bomb).
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RAW_BYTES * 2) {
    return json({ ok: false, error: "too_large" }, 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return json({ ok: false, error: "invalid_input" }, 400);

  const raw = Buffer.from(await file.arrayBuffer());
  if (!sniffImageFormat(raw)) return json({ ok: false, error: "unsupported_format" }, 400);

  let processed: Buffer;
  try {
    processed = await processAvatarImage(raw);
  } catch (err) {
    if (err instanceof AvatarImageError) {
      const status = err.code === "too_large" ? 413 : 400;
      return json({ ok: false, error: err.code }, status);
    }
    throw err;
  }

  const current = await prisma.profile.findUnique({ where: { id: user.id }, select: { avatarUploaded: true } });

  const path = newAvatarPath(user.id);
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, processed, { contentType: "image/webp", upsert: false });
  if (uploadError) {
    console.error("[avatar upload] storage upload failed", user.id, uploadError.message);
    return json({ ok: false, error: "upload_failed" }, 502);
  }

  const newUrl = avatarPublicUrl(path);
  await prisma.profile.update({ where: { id: user.id }, data: { avatarUploaded: newUrl } });

  // Best-effort: the new photo is already live and saved by this point. A failure to delete the
  // old object leaks one orphaned file rather than breaking the customer's upload — logged, not
  // surfaced, and not worth retrying inline on a request the customer is waiting on.
  const previousPath = current?.avatarUploaded ? avatarStoragePath(current.avatarUploaded) : null;
  if (previousPath) {
    const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
    if (removeError) console.error("[avatar upload] failed to delete previous object", user.id, removeError.message);
  }

  return json({ ok: true, data: await getAuthUser(user) });
}

/**
 * Clears the customer's own uploaded photo. Falls back to avatarProvider (the Google photo, if
 * any), never to nothing — "remove my photo" means "go back to the default", matching what a
 * customer who signed up with Google would actually expect.
 *
 * The object is actually gone from storage once this returns, but Supabase's storage CDN can
 * briefly keep serving a cached response for the old (now-dead) public URL — object paths are
 * random per upload and never reused, so nothing new can discover that URL to exploit the window,
 * but don't write UI copy that promises the old photo is instantly unreachable everywhere.
 */
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ ok: false }, 403);

  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  if (!prisma) return json({ ok: false }, 503);

  const supabase = await createSupabaseServer();
  if (!supabase) return json({ ok: false }, 503);

  const current = await prisma.profile.findUnique({ where: { id: user.id }, select: { avatarUploaded: true } });
  await prisma.profile.update({ where: { id: user.id }, data: { avatarUploaded: null } });

  const path = current?.avatarUploaded ? avatarStoragePath(current.avatarUploaded) : null;
  if (path) {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) console.error("[avatar upload] failed to delete object on clear", user.id, error.message);
  }

  return json({ ok: true, data: await getAuthUser(user) });
}
