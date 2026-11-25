import { MARKETING_SITE as site, marketingUrl } from "./site";

/**
 * The Organization JSON-LD block every marketing page carries (was schema/organization.njk).
 * Shaped exactly like the built mirror, including its quirk that "url" points at
 * https://zennly.io/businesses (the mirror sync rewrote the template's "{{ site.url }}/").
 */
const KNOWS_ABOUT: string[] = [
  "Staff transfer between branches software",
  "Staff attendance software for spas and salons",
  "Therapist scheduling across branches",
  "Salon software Nepal",
  "Salon and spa marketing campaigns",
  "Customer outreach and win-back messages",
  "Discount approval and limits by role",
  "Spa payroll and commission software",
  "Gift voucher and package tracking",
  "Waiting list software for spas and salons",
  "Walk-in queue management",
  "Class capacity limits for fitness and yoga studios",
  "Digital consent forms for tattoo and clinic businesses",
  "Nail studio booking software",
  "Yoga studio booking software",
  "Fitness studio class booking",
  "Barbershop booking software",
  "Beauty clinic software",
  "Bridal and makeup studio booking software",
  "Tattoo and piercing studio booking software",
  "Spa software Nepal",
  "Gym management software Nepal",
  "Clinic appointment software",
  "Membership management software",
  "Appointment scheduling software",
  "Booking software Nepal",
  "Online booking system Nepal",
  "Multi-branch booking",
  "Multi-branch spa management",
  "Spa management software",
  "Spa booking software",
  "Salon booking software",
  "Beauty parlour software",
  "Tattoo studio booking software",
  "Gym management software",
  "Physiotherapy clinic scheduling software",
  "Cleaning service scheduling software",
  "Staff scheduling",
  "Staff transfers between branches",
  "Discount approval workflows",
  "Daily revenue reconciliation",
  "Payment tracking by method",
  "Role-based access control",
  "Spa payroll software Nepal",
  "Therapist commission calculation",
  "Reduce paperwork in spas and salons",
  "AI receptionist for spas and salons",
  "AI assistant for booking",
  "Customer outreach SMS WhatsApp email",
  "Gift vouchers and packages software",
  "Multi-location salon management",
  "Single-location spa and salon software",
  "Wellness center booking software",
  "Booking software for small and multi-branch businesses"
];

const ORG_AREA_SERVED = [
  {
    "@type": "Country",
    "name": "Nepal"
  },
  {
    "@type": "City",
    "name": "Kathmandu"
  },
  {
    "@type": "City",
    "name": "Lalitpur"
  },
  {
    "@type": "City",
    "name": "Bhaktapur"
  },
  {
    "@type": "City",
    "name": "Pokhara"
  },
  {
    "@type": "City",
    "name": "Biratnagar"
  },
  {
    "@type": "City",
    "name": "Bharatpur"
  },
  {
    "@type": "Country",
    "name": "United States"
  },
  {
    "@type": "Country",
    "name": "United Kingdom"
  },
  {
    "@type": "Country",
    "name": "Canada"
  },
  {
    "@type": "Country",
    "name": "Australia"
  },
  {
    "@type": "Country",
    "name": "United Arab Emirates"
  },
  {
    "@type": "Place",
    "name": "Worldwide"
  }
];

const SOFTWARE_AREA_SERVED = [
  {
    "@type": "Country",
    "name": "Nepal"
  },
  {
    "@type": "Country",
    "name": "United States"
  },
  {
    "@type": "Country",
    "name": "United Kingdom"
  },
  {
    "@type": "Country",
    "name": "Canada"
  },
  {
    "@type": "Country",
    "name": "Australia"
  },
  {
    "@type": "Country",
    "name": "United Arab Emirates"
  },
  {
    "@type": "Place",
    "name": "Worldwide"
  }
];

const SOFTWARE_KEYWORDS = "booking software Nepal, salon campaigns and customer outreach, stop staff discounts approval control, spa payroll software, gift voucher tracking, waiting list software Nepal, walk-in queue management salon, class capacity limits yoga studio, digital consent forms tattoo studio, salon software Nepal, nail studio booking software Nepal, yoga studio booking software Nepal, fitness studio software Nepal, barbershop booking app Nepal, beauty clinic software Nepal, bridal makeup booking software Nepal, tattoo and piercing studio software Nepal, spa software Nepal, gym management software Nepal, appointment booking system Nepal, salon management system Nepal, beauty parlour management software, clinic appointment software Nepal, spa booking app Nepal, membership management software Nepal, booking software for spas and salons, multi-branch booking software, spa management software, salon management software, appointment scheduling software, online booking system Nepal, spa booking software, salon booking software, beauty parlour software, gym management software, physiotherapy clinic software, cleaning service scheduling, multi-branch scheduling, daily reconciliation, discount approval, payroll software Nepal, spa payroll and commission, reduce paperwork spa salon, AI receptionist spa salon Nepal, wellness center booking software, single location salon software, small business booking software Nepal, multi-location spa software, multi-location salon software, spa and salon software USA, salon booking software UK, spa management software UAE, appointment scheduling software Australia";

const FEATURE_LIST: string[] = [
  "Online booking with conflict prevention",
  "Waiting list for full slots",
  "Live walk-in queue with estimated wait times",
  "Class capacity limits",
  "Digital consent forms",
  "Staff and room scheduling",
  "Scheduled staff transfers between branches, temporary or permanent",
  "Visiting therapist locked at home branch during a temporary transfer and reopened for bookings when it ends",
  "Extend a transfer or recall a therapist early",
  "Notification to the receiving branch on a staff transfer",
  "Staff attendance records: in, out and absent",
  "Discount approval with an audit trail",
  "Payment tracking by method",
  "Daily revenue reconciliation",
  "Role-based access",
  "Multi-branch reports",
  "Monthly payroll with attendance deductions and commission per branch",
  "Memberships, packages and gift vouchers",
  "Customer win-back and review outreach",
  "AI receptionist for calls and chats (on request)",
  "Paperless daily close"
];

const AUDIENCE = {
  "@type": "BusinessAudience",
  "audienceType": "Spas, salons, nail studios, wellness centers, gyms, yoga and fitness studios, barbershops, beauty and skin clinics, bridal and makeup studios, tattoo and piercing studios, physiotherapy clinics and cleaning services"
};

export function organizationSchema() {
  const businessesUrl = `${site.origin}${site.basePath}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${site.origin}/#organization`,
        name: site.name,
        alternateName: site.alternateName,
        url: businessesUrl,
        description: site.defaultDescription,
        disambiguatingDescription: site.disambiguatingDescription,
        telephone: site.telephone,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.address.locality,
          addressRegion: site.address.region,
          postalCode: site.address.postalCode,
          addressCountry: site.address.country,
        },
        parentOrganization: { "@type": "Organization", name: site.parentOrganization.name, url: site.parentOrganization.url },
        geo: { "@type": "GeoCoordinates", latitude: 27.6588, longitude: 85.3247 },
        hasMap: "https://share.google/OMw78VXlwqW4GTaON",
        foundingDate: site.foundingDate,
        foundingLocation: { "@type": "Place", name: `${site.address.locality}, ${site.address.region}, Nepal` },
        slogan: site.slogan,
        logo: { "@type": "ImageObject", url: marketingUrl(site.logo) },
        knowsAbout: KNOWS_ABOUT,
        areaServed: ORG_AREA_SERVED,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          email: "info@zennly.io",
          telephone: site.telephone,
          areaServed: ["NP", "Worldwide"],
          availableLanguage: "English",
        },
        sameAs: site.sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${site.origin}/#website`,
        url: businessesUrl,
        name: site.name,
        inLanguage: "en",
        publisher: { "@id": `${site.origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.origin}/#software`,
        name: site.name,
        alternateName: site.alternateName,
        disambiguatingDescription: site.disambiguatingDescription,
        url: businessesUrl,
        sameAs: site.sameAs,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: site.defaultDescription,
        inLanguage: "en",
        keywords: SOFTWARE_KEYWORDS,
        featureList: FEATURE_LIST,
        audience: AUDIENCE,
        areaServed: SOFTWARE_AREA_SERVED,
        publisher: { "@id": `${site.origin}/#organization` },
      },
    ],
  };
}
