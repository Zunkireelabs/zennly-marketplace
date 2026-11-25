import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Zennly",
  description: "What the Zennly marketplace collects when you search, save studios, sign in and book, and how it is used.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="24 November 2026">
      <p>
        This policy is for shoppers using the Zennly marketplace at zennly.io: searching, saving studios, logging in
        and booking. Businesses that use Zennly&apos;s software are covered by a separate policy at{" "}
        {/* Different root layout (marketing site), so a full page load is intended, as in the marketing nav. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="underline" href="/businesses/privacy-policy">
          /businesses/privacy-policy
        </a>
        .
      </p>

      <LegalSection title="1. Who we are">
        <p>
          Zennly is operated by Zunkiree Labs, registered at Sanepa, 44600, Nepal. &ldquo;We&rdquo; means Zennly.
          Contact for privacy questions: info@zennly.io.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <p className="font-medium text-foreground">Account details you give us or sign in with</p>
        <LegalList>
          <li>Name (first and last) and email address.</li>
          <li>
            If you sign in with Google: the name, email and profile photo Google shares with us. We do not get your
            Google password.
          </li>
          <li>
            Optional profile details you choose to add: phone number, gender, country, date of birth, and a profile
            photo you upload. The phone number is typed in by you and is not verified; we do not send SMS codes today.
          </li>
          <li>Your consent choices: what you agreed to, when, and where you agreed.</li>
        </LegalList>

        <p className="mt-2 font-medium text-foreground">What you do on Zennly</p>
        <LegalList>
          <li>
            Studios you save. Before you log in, saved studios stay in your browser only; when you log in they are
            added to your account.
          </li>
          <li>
            <strong>Bookings.</strong> When you book at a studio connected to our booking system, we send that system
            your name, email, phone number, the service, date and time, and any special request you type. It creates
            the appointment and shares it with the studio. For some studios you are instead sent to our booking site
            (app.zennly.io) to finish. Booking records are kept by the booking system and the studio.
          </li>
          <li>
            <strong>Referrals.</strong> If you use &ldquo;Refer a friend&rdquo;, we make you a personal invite code. If
            you sign up through a friend&rsquo;s link, we record who invited you, when you joined and when you made your
            first booking, so we can send your friend their reward.
          </li>
          <li>The marketplace does not take payment itself. Payment is made at the studio.</li>
        </LegalList>

        <p className="mt-2 font-medium text-foreground">Usage information</p>
        <LegalList>
          <li>
            Anonymous usage events: which studio pages are viewed, that a search was run (not the words you typed),
            saves and unsaves, &ldquo;Book&rdquo; clicks, and sign-in steps. Each event carries a random anonymous ID
            kept in your browser&apos;s local storage. If you are signed in, the event is also linked to your account.
            Events never contain your name, email or phone number. These events are stored.
          </li>
          <li>
            <strong>Location:</strong> only if you press &ldquo;Near me&rdquo;. Your browser asks permission first.
            Your position is used inside your browser to pick the nearest destination and is not sent to our servers.
          </li>
          <li>
            Technical data our servers and host log by default (IP address, browser type, pages requested). We keep
            these logs for 90 days.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Cookies and similar storage">
        <LegalList>
          <li>
            A <strong>sign-in session cookie</strong> set by our login provider (Supabase) so you stay logged in. It is
            needed for login to work.
          </li>
          <li>
            <strong>Local storage</strong> in your browser: the anonymous ID above, your saved studios before you log
            in, and a flag that remembers you dismissed the &ldquo;complete your profile&rdquo; prompt.
          </li>
          <li>
            <strong>Google Analytics.</strong> We use Google Analytics across zennly.io, including the marketplace. It
            only loads if you click Accept on the cookie notice, and you can decline. If you accept, it sets cookies in
            your browser and sends Google information about the pages you visit and your device, so we can see how the
            site is used. We do not use advertising cookies.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Why we use it">
        <LegalList>
          <li>To run your account, sign you in and keep your saved studios.</li>
          <li>To create your booking and pass it to the studio you choose.</li>
          <li>
            To email you login codes and messages about your account or bookings (sent through Resend). Any marketing
            email we send comes from info@zennly.io, and you can ask us at that address to stop it.
          </li>
          <li>To understand which parts of the marketplace are used so we can improve them.</li>
          <li>To keep the service secure and meet legal duties.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Who we share it with">
        <LegalList>
          <li>
            <strong>The studio you book with</strong> receives the details needed for your booking.
          </li>
          <li>
            <strong>Service providers</strong> that run Zennly for us: Supabase (login and database), Resend (email),
            Google (Google Analytics, and Google sign-in if you choose it), and Zunkiree Labs, which hosts the Zennly
            website on its own servers.
          </li>
          <li>
            <strong>Authorities</strong>, only where the law requires.
          </li>
          <li>We do not sell your personal information.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <p>
          We keep your account data until you delete your account. Booking records are kept by the booking system and
          the studio for as long as the studio needs them. Server logs are kept for 90 days.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices">
        <LegalList>
          <li>See and edit your profile in your account.</li>
          <li>
            <strong>Delete your account</strong> yourself in your account settings. This removes your saved studios,
            consent records, referral records, usage events linked to you, your profile and your login. It does not delete bookings,
            which are kept by the booking system and the studio; to ask about those, email info@zennly.io and we
            answer within 7 days.
          </li>
          <li>
            Get a copy of your data: use &ldquo;Download my data&rdquo; in your account settings, or email
            info@zennly.io and we answer within 7 days. The file covers what the marketplace holds; bookings are kept
            by the booking system and the studio.
          </li>
          <li>Withdraw consent to email at any time.</li>
          <li>Refuse location access in your browser.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          Zennly is not for people under 16. If we learn we hold a child&apos;s data, we delete it.
        </p>
      </LegalSection>

      <LegalSection title="9. Where your data is stored">
        <p>
          The Zennly website is hosted by Zunkiree Labs on its own servers. Those servers are in Nepal. Our login and
          database provider, Supabase, stores data in Mumbai, India, so your data is transferred outside Nepal.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>We post updates here with a new date. For material changes we will tell logged-in users.</p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>Email: info@zennly.io. Postal address: Zunkiree Labs, Sanepa, 44600, Nepal.</p>
      </LegalSection>
    </LegalPage>
  );
}
