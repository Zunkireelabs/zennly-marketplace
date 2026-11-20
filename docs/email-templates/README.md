# Supabase email templates

Supabase Auth email templates live **only in the dashboard**. They are not part of any migration,
they do not survive a database restore, and they must be set separately per project — so a
staging/production split means pasting them twice, by hand, with nothing to diff against.

This project has been bitten by dashboard-only configuration repeatedly: migrations 013, 337 and
338 all existed in one database and not the other, and the `pin-login` Edge Function has no source
in any repo. Keeping template sources here makes them reviewable and re-pasteable.

**These files are not loaded by anything.** They are the source of truth for what *should* be in
the dashboard. If you change the template there, change it here.

| File | Dashboard location |
|---|---|
| `change-email-address.html` | Authentication → Emails → Templates → Change email address |

## The one thing to get right

Templates that ask for a **code** must use `{{ .Token }}`. Supabase's defaults use
`{{ .ConfirmationURL }}`, which sends a clickable link instead — and a UI built to accept a code
will then wait forever for something that never arrives, with no error anywhere.

The login ("Magic link or OTP") template was switched to `{{ .Token }}` long ago. Change email
address was not, until 2026-11-20.
