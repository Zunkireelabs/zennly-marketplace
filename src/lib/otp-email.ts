import "server-only";

/**
 * Ported verbatim (content/markup unchanged) from otp-service/server.js's renderEmail +
 * sendEmail. Without RESEND_API_KEY it logs the code instead of sending — kept exactly, this is
 * the documented dev behaviour, not a fallback to silently work around.
 *
 * server.js enforced the production/dev split at startup: `if (IS_PROD && !RESEND_API_KEY)
 * process.exit(1)`. A Next route can't exit(1) without taking the whole app down over one
 * missing key, so OTP_MISCONFIGURED_IN_PROD below is the same check, applied by the caller
 * (send/route.ts) per-request instead of once at boot — same refusal, just deferred.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
export const OTP_MISCONFIGURED_IN_PROD = process.env.NODE_ENV === "production" && !RESEND_API_KEY;
// Sender is noreply@ — owner's instruction, 2026-11-23. server.js defaulted to info@zennly.io,
// which Resend would reject unless that exact sender is configured on the verified domain.
// The footer's mailto: deliberately stays info@zennly.io: the envelope is unattended, so the
// body still has to offer a human address for anyone who wants to reply.
const FROM = process.env.OTP_FROM || "Zennly <noreply@zennly.io>";
const SITE_URL = (process.env.SITE_URL || "https://zennly.io").replace(/\/$/, "");

/**
 * These two images live in the mirrored marketing site, so they are served under /businesses/.
 * server.js could write `/assets/images/...` because web-zenly was the site root; here that path
 * 308s to /businesses/assets/... via next.config's MOVED_MARKETING_PREFIXES. Verified both:
 * /assets/images/email-logo-white.png → 308, /businesses/assets/images/email-logo-white.png → 200.
 * Email clients are not browsers — image proxies (Gmail) and desktop clients handle redirects
 * inconsistently, and a logo that silently fails to render is the kind of thing nobody notices
 * until a prospect sees a broken email. Point at the final URL and skip the hop entirely.
 */
const LOGO_WHITE_URL = `${SITE_URL}/businesses/assets/images/email-logo-white.png`;
const PREVIEW_URL = `${SITE_URL}/businesses/assets/images/email-dashboard.png`;

function renderEmail(name: string, code: string, link: string): { html: string; text: string } {
  const first = (name || "").trim().split(/\s+/)[0].replace(/[<>&"']/g, "");
  const hi = first ? `Hi ${first}, here&rsquo;s your code` : "Here&rsquo;s your code";
  const digit = (d: string) =>
    `<td style="padding:0 3px"><div style="width:44px;height:62px;line-height:62px;text-align:center;background:#FFFFFF;border-radius:14px;font-size:30px;font-weight:700;color:#1C1C1C;font-family:Helvetica,Arial,sans-serif">${d}</div></td>`;
  const tick = (t: string) =>
    `<td align="center" valign="top" style="padding:0 4px"><div style="width:26px;height:26px;line-height:26px;margin:0 auto 8px;border-radius:50%;background:#DCEBDC;color:#3F6839;font-weight:700;font-size:14px">&#10003;</div><div style="font-size:13px;line-height:1.4;font-weight:600;color:#302E2D">${t}</div></td>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F0E6D3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your Zennly demo code is ${code}. Tap the button to open your demo.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0E6D3"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:28px;overflow:hidden">
 <tr><td align="center" style="background:#2F5229;background-image:radial-gradient(circle at 0% 0%,#5A8C50 0,rgba(90,140,80,0) 50%),radial-gradient(circle at 100% 100%,#1B3418 0,rgba(27,52,24,0) 60%);padding:40px 20px 44px">
  <img src="${LOGO_WHITE_URL}" alt="Zennly" width="132" style="display:block;width:132px;height:auto;margin:0 auto 30px;color:#FFFFFF;font-family:Georgia,serif;font-size:34px;line-height:40px;text-align:center">
  <span style="display:inline-block;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.14);font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#E3F0DF;font-weight:700">Free demo &middot; Verify your email</span>
  <h1 style="margin:20px 0 8px;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.1;color:#FFFFFF">${hi}</h1>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.5;color:#CFE3CB">Enter it in the demo window, or just tap the button below.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>${code.split("").map(digit).join("")}</tr></table>
  <p style="margin:20px 0 0;font-size:13px;color:#CFE3CB">Expires in 10 minutes &middot; works once</p>
 </td></tr>
 <tr><td align="center" style="padding:34px 24px 6px"><a href="${link}" style="display:inline-block;background:#1C1C1C;color:#FFFFFF;text-decoration:none;font-size:17px;font-weight:600;padding:18px 38px;border-radius:999px">Open my demo &rarr;</a>
  <p style="margin:14px 0 0;font-size:13px;color:#8a8d85">One tap &mdash; the code is filled in for you.</p></td></tr>
 <tr><td style="padding:28px 20px 0"><div style="background:#DCEBDC;border-radius:20px;padding:26px 18px 18px;text-align:center">
  <p style="margin:0 0 16px;font-size:12px;letter-spacing:1.4px;font-weight:700;text-transform:uppercase;color:#3F6839">What you&rsquo;re about to see</p>
  <img src="${PREVIEW_URL}" alt="Bookings, payments and your team in one dashboard" width="480" style="display:block;width:100%;max-width:480px;height:auto;margin:0 auto;color:#3F6839;font-size:14px;line-height:20px;text-align:center">
 </div></td></tr>
 <tr><td style="padding:26px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tick("Bookings &amp; calendar")}${tick("Payments &amp; reports")}${tick("Team &amp; payroll")}</tr></table>
  <p style="margin:22px 0 0;text-align:center;font-size:14px;line-height:1.6;color:#6A6E65">You get a login to a live sample spa. No credit card, nothing to install.</p></td></tr>
 <tr><td style="padding:24px 24px 30px;text-align:center;font-size:13px;line-height:1.6;color:#8a8d85">Didn&rsquo;t request this? You can ignore this email &mdash; nobody can get in without the code sent to your inbox.</td></tr>
 <tr><td style="background:#FFFFFF;border-top:1px solid #EFE7D8;padding:22px 24px;text-align:center;font-size:12px;line-height:1.7;color:#6A6E65">Zennly &middot; Booking software for spas, salons &amp; studios<br><a href="https://zennly.io" style="color:#3F6839;text-decoration:none;font-weight:700">zennly.io</a> &middot; <a href="mailto:info@zennly.io" style="color:#3F6839;text-decoration:none;font-weight:700">info@zennly.io</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${first ? `Hi ${first},\n\n` : ""}Your Zennly demo code is ${code}. It expires in 10 minutes.\n\nOpen your demo (code filled in for you): ${link}\n\nIf you didn't ask for it, you can ignore this email.\n\nZennly - zennly.io`;
  return { html, text };
}

export async function sendOtpEmail(to: string, name: string, code: string, link: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[dev] code for ${to}: ${code}\n[dev] link: ${link}`);
    return;
  }
  const { html, text } = renderEmail(name, code, link);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: `${code} is your Zennly demo code`, text, html }),
  });
  if (!res.ok) {
    // server.js threw `resend-${status}` and discarded the body. That status alone cannot tell
    // "key is wrong" (401/403) from "sender/domain not verified" (422) with any confidence, and
    // the body is where Resend actually explains itself ("The zennly.io domain is not verified...").
    // Log it: this call can only be exercised against production, where the response body is the
    // only evidence available.
    const detail = await res.text().catch(() => "");
    console.error(`resend ${res.status}: ${detail.slice(0, 500)}`);
    const err = new Error(`resend-${res.status}`) as Error & { upstreamStatus?: number };
    err.upstreamStatus = res.status;
    throw err;
  }
}

export { SITE_URL };
