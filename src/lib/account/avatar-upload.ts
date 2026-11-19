import "server-only";

export const AVATAR_BUCKET = "avatars";

/**
 * The public URL prefix Supabase Storage always uses for a public bucket's objects —
 * confirmed live via storage.from('avatars').getPublicUrl(...) against this project, not guessed.
 * Used both to build a freshly-uploaded object's URL and to recover the storage PATH back out of
 * a previously-stored avatarUploaded URL, so the previous object can be deleted on replace.
 */
function publicUrlPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/`;
}

export function avatarPublicUrl(path: string): string | null {
  const prefix = publicUrlPrefix();
  return prefix ? `${prefix}${path}` : null;
}

/** Recovers the storage path from a stored avatarUploaded URL, or null if it isn't one of ours
 * (defensive — never throws on an unexpected stored value). */
export function avatarStoragePath(url: string): string | null {
  const prefix = publicUrlPrefix();
  if (!prefix || !url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}

/** `<userId>/<random>.webp` — unguessable (random, not derived from anything public) and already
 * namespaced by owner, which is exactly what the storage RLS policies key off of
 * ((storage.foldername(name))[1] = auth.uid()::text). */
export function newAvatarPath(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.webp`;
}
