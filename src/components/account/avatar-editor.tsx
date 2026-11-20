"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * The avatar circle, plus upload/remove. `avatar` is already the single resolved value
 * (avatarUploaded ?? avatarProvider) toAuthUser() decided — this component has no idea whether
 * what's showing is an upload or the Google default, by design: "Remove photo" always just means
 * "clear my upload, fall back to the default (or the initial letter if there is none)", which is
 * safely idempotent to call even when there's nothing to clear.
 *
 * `editing` comes from the page, which also drives ProfileEditCard. Change/Remove are hidden until
 * the customer actually asks to edit: a profile page is something you mostly visit to *read*, and
 * a permanently-live "Remove" next to your own photo is an accident waiting to happen. The circle
 * itself always renders, so the header doesn't reflow when the form opens.
 */
export function AvatarEditor({
  avatar,
  initial,
  editing,
}: {
  avatar: string | undefined;
  initial: string;
  editing: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      setError("That image is too large (max 5MB).");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: form })
      .then((r) => ({ ok: r.ok }))
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't upload that photo — try a different one.");
      return;
    }
    await auth.refresh();
    toast.success("Profile photo updated");
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/account/avatar", { method: "DELETE" })
      .then((r) => ({ ok: r.ok }))
      .catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't remove that photo — try again.");
      return;
    }
    await auth.refresh();
    toast.success("Profile photo removed");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-primary text-xl font-semibold text-primary-foreground">
        {avatar ? <Image src={avatar} alt="" fill sizes="56px" className="object-cover" /> : initial}
      </div>
      {!editing ? null : (
      <div className="flex items-center gap-2 text-xs">
        <label className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline">
          {busy ? "Working…" : "Change"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // same file picked twice in a row still fires onChange
              if (file) void upload(file);
            }}
          />
        </label>
        {avatar && (
          <>
            <span className="text-muted-foreground">·</span>
            <button type="button" disabled={busy} onClick={() => void remove()} className="font-medium text-foreground underline-offset-2 hover:underline">
              Remove
            </button>
          </>
        )}
      </div>
      )}
      {editing && error && <p className="max-w-[9rem] text-xs text-error">{error}</p>}
    </div>
  );
}
