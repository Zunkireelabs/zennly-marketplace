"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { AvatarEditor } from "@/components/account/avatar-editor";
import { CompletenessPrompt } from "@/components/account/completeness-prompt";
import { ProfileEditCard } from "@/components/account/profile-edit-card";

/**
 * AccountShell already gates every /account/* route behind sign-in, so `user` is assumed here —
 * this never renders while signed out.
 *
 * `editing` lives here rather than inside ProfileEditCard because it drives two things that sit
 * in different parts of the page: the details form, and the avatar's Change/Remove controls up in
 * the header. One state, so the photo can't be editable while the details aren't.
 */
export default function AccountProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!user) return null;

  // firstName (a stored field) beats name.split(" ") (derived) beats the email local-part (not a
  // name at all) — a customer who's set their name no longer gets greeted by their email address.
  const greetingName = user.firstName ?? user.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";
  const initial = (user.name ?? user.email ?? user.phone ?? "?").replace(/^\+/, "").charAt(0).toUpperCase();

  return (
    <section>
      <div className="flex items-center gap-4">
        <AvatarEditor avatar={user.avatar} initial={initial} editing={editing} />
        <div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Welcome back, {greetingName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <CompletenessPrompt />
      <ProfileEditCard editing={editing} setEditing={setEditing} />
    </section>
  );
}
