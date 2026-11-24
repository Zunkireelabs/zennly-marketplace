import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use | Zennly",
  description: "The terms for using the Zennly marketplace to find and book spas, salons and wellness studios.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="24 November 2026">
      <LegalSection title="1. What Zennly is">
        <p>
          Zennly is an online marketplace where you can find spas, salons and wellness studios and book with them.
          Zennly is operated by Zunkiree Labs, registered at Sanepa, 44600, Nepal. The studios are independent
          businesses. <strong>Zennly is not the provider of the treatments or services you book.</strong>
        </p>
      </LegalSection>

      <LegalSection title="2. Using Zennly">
        <LegalList>
          <li>You must be at least 16 years old, or have a parent or guardian&apos;s permission.</li>
          <li>Give accurate details and keep your login secure. You are responsible for activity on your account.</li>
          <li>
            Do not misuse the service: no scraping, no attempts to break or overload it, no fake bookings, no
            harassing studios or staff, nothing unlawful.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Bookings">
        <LegalList>
          <li>
            When you book, you make an arrangement with the studio, not with Zennly. The studio sets its own
            services, prices, availability, cancellation and no-show rules. Zennly passes your booking details
            (name, email, phone, service, date, time and any request you add) to the studio through our booking
            system.
          </li>
          <li>The marketplace does not take payment. Payment is made at the studio.</li>
          <li>
            Prices and availability are shown as the studio provides them. Errors can happen; the studio&apos;s
            confirmation is what counts.
          </li>
          <li>
            Cancellation, refunds and complaints about a service go to the studio first. We will help where we
            reasonably can; email info@zennly.io. This help is not a guarantee of any outcome.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Studio information and reviews">
        <p>
          Studio descriptions, photos and prices are supplied by the studios. Ratings and review summaries come from
          third-party listings, such as Google Business profiles, not from Zennly. Shoppers cannot post reviews on
          Zennly today. We do not guarantee that this information is complete or current.
        </p>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>
          If you upload content (for example a profile photo), you keep ownership but give Zennly a licence to
          display and store it to run the service. You confirm you have the right to upload it. We may remove
          content that breaks these Terms.
        </p>
      </LegalSection>

      <LegalSection title="6. Our content">
        <p>
          The Zennly name, logo, site design and software belong to Zennly or its licensors. You may use the site for
          personal, non-commercial use. You may not copy, resell or build a competing service from it.
        </p>
      </LegalSection>

      <LegalSection title="7. Availability and changes">
        <p>
          We aim to keep Zennly running but do not promise it will always be available or error-free. We may change
          or stop features. We may suspend accounts that break these Terms. You can delete your account yourself in
          your account settings.
        </p>
      </LegalSection>

      <LegalSection title="8. Our responsibility">
        <p>
          Services are provided &ldquo;as is&rdquo;. To the extent the law allows, Zennly is not liable for the
          quality or safety of services provided by studios, for loss caused by studio errors or cancellations, or
          for indirect or consequential loss. Nothing here limits liability that the law does not allow to be
          limited.
        </p>
      </LegalSection>

      <LegalSection title="9. Privacy">
        <p>
          How we handle your personal information is in the <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to these Terms">
        <p>
          We may update these Terms and will post the new date. Continuing to use Zennly after a change means you
          accept it. For material changes we will notify logged-in users.
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law and disputes">
        <p>
          These Terms are governed by the laws of Nepal. Any dispute will be handled by the courts of Kathmandu,
          Nepal.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>Email: info@zennly.io. Postal address: Zunkiree Labs, Sanepa, 44600, Nepal.</p>
      </LegalSection>
    </LegalPage>
  );
}
