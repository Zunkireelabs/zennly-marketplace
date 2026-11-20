import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Tells every connected studio that a customer's email has moved, so staff dashboards stop
 * showing an address the customer no longer reads.
 *
 * Called ONLY after both verification codes have been accepted — never on a pending change. The
 * studio's record is operational data (it's the address staff actually write to), so it must not
 * move on a change that might still be abandoned.
 *
 * ## Best-effort, deliberately
 *
 * A studio's system being unreachable must never fail the customer's own email change: their
 * account is theirs, and holding it hostage to a third party's uptime would be wrong even if it
 * were convenient. Failures are logged, not surfaced, and not retried inline.
 *
 * That is safe here for a specific reason worth stating, because it is the thing that makes a
 * retry queue unnecessary: the cross-studio history fan-out
 * (src/app/api/account/studio-history/route.ts) queries EVERY verified ProfileFactor, including
 * the old address. So if this push fails, the **customer's** view of their own history is
 * unaffected — only the **staff's** view goes stale. The blast radius is "staff have an old email
 * for a while", not "the customer lost their bookings".
 *
 * ## Email only
 *
 * Phone is not propagated and must not be added here until SMS verification exists. The
 * marketplace's phone is self-asserted (a plain form PATCH; phoneVerifiedAt is always null), and
 * in book-spa phone is the identity — `customers` is uniquely indexed on (org, normalized phone)
 * and not on email. A phone write either collides with another client at that org or silently
 * repoints which record a customer's future bookings attach to. See book-spa's migration-339.
 */
export async function syncEmailToStudios(oldEmail: string, newEmail: string): Promise<void> {
  const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
  const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;
  if (!functionsUrl || !secret || !prisma) return;
  if (oldEmail.toLowerCase() === newEmail.toLowerCase()) return;

  const providers = await prisma.provider
    .findMany({ where: { engineProviderId: { not: null } }, select: { engineProviderId: true } })
    .catch(() => []);

  // Fanned out in parallel and bounded by a short timeout each: this runs inside the request the
  // customer is waiting on for their "email changed" confirmation, and a slow studio must not
  // make a completed change feel broken.
  await Promise.all(
    providers.map(async (p) => {
      const orgSlug = p.engineProviderId;
      if (!orgSlug) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${functionsUrl}/marketplace-update-customer-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
          body: JSON.stringify({ org_slug: orgSlug, old_email: oldEmail, new_email: newEmail }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        // 404 ORG_NOT_ENABLED is a configuration answer, not a failure — an org that hasn't opted
        // into contact sync is simply not participating, and logging it as an error every time
        // would train everyone to ignore this log.
        if (!res.ok && res.status !== 404) {
          console.error("[contact-sync] studio rejected the update", orgSlug, res.status);
        }
      } catch (err) {
        console.error("[contact-sync] could not reach studio", orgSlug, err instanceof Error ? err.message : err);
      }
    })
  );
}
