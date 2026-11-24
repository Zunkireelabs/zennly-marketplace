/** Footer link columns (was inline in marketing/src/_includes/_footer-v2.njk). Hrefs in source form; see businessesHref(). */
export interface FooterLink { href: string; label: string; /** opens the demo pop-up */ trial?: true }
export interface FooterColumn { heading: string; links: FooterLink[] }

export const FOOTER_PRODUCT_COLUMNS: FooterColumn[] = [
  {
    "heading": "Take bookings",
    "links": [
      {
        "href": "/features/booking/",
        "label": "Online booking"
      },
      {
        "href": "/features/ai-assistant/",
        "label": "AI receptionist"
      },
      {
        "href": "/features/outreach/",
        "label": "Customer outreach"
      },
      {
        "href": "/features/campaigns/",
        "label": "Campaigns"
      }
    ]
  },
  {
    "heading": "Run your team",
    "links": [
      {
        "href": "/features/operational-visibility/",
        "label": "Operations"
      },
      {
        "href": "/features/staff-management/",
        "label": "Staff management"
      },
      {
        "href": "/features/role-based-access/",
        "label": "Role-based access"
      },
      {
        "href": "/features/payroll/",
        "label": "Payroll"
      }
    ]
  },
  {
    "heading": "Control the money",
    "links": [
      {
        "href": "/features/payment-tracking/",
        "label": "Payments & daily close"
      },
      {
        "href": "/features/discount-management/",
        "label": "Discount control"
      },
      {
        "href": "/features/reports/",
        "label": "Reports"
      },
      {
        "href": "/features/memberships/",
        "label": "Memberships"
      },
      {
        "href": "/features/packages/",
        "label": "Packages"
      },
      {
        "href": "/features/vouchers/",
        "label": "Vouchers"
      }
    ]
  },
  {
    "heading": "Industries",
    "links": [
      {
        "href": "/solutions/spa/",
        "label": "Spas & wellness"
      },
      {
        "href": "/solutions/salon/",
        "label": "Hair & nail salons"
      },
      {
        "href": "/solutions/barbershop/",
        "label": "Barbershops"
      },
      {
        "href": "/solutions/beauty-clinic/",
        "label": "Beauty clinics"
      },
      {
        "href": "/solutions/fitness/",
        "label": "Fitness & PT"
      },
      {
        "href": "/solutions/",
        "label": "All industries"
      }
    ]
  }
];

/** First three columns of the second grid; the fourth is the tagline block. */
export const FOOTER_SMALL_COLUMNS: FooterColumn[] = [
  {
    "heading": "Resources",
    "links": [
      {
        "href": "/blog/",
        "label": "Blog"
      },
      {
        "href": "/faq/",
        "label": "FAQ"
      },
      {
        "href": "/compare/",
        "label": "Compare"
      },
      {
        "href": "/glossary/",
        "label": "Glossary"
      },
      {
        "href": "/daily-close-checklist/",
        "label": "Daily close checklist"
      }
    ]
  },
  {
    "heading": "Company",
    "links": [
      {
        "href": "/about/",
        "label": "About"
      },
      {
        "href": "/case-study/",
        "label": "Case study"
      },
      {
        "href": "/pricing/",
        "label": "Pricing"
      },
      {
        "href": "/press/",
        "label": "Press"
      },
      {
        "href": "/nepal/",
        "label": "Zennly in Nepal"
      },
      {
        "href": "/global/",
        "label": "Worldwide"
      }
    ]
  },
  {
    "heading": "Support",
    "links": [
      {
        "href": "tel:+9779747491787",
        "label": "+977 974-749-1787"
      },
      {
        "href": "mailto:info@zennly.io",
        "label": "info@zennly.io"
      },
      {
        "href": "/contact/",
        "label": "Contact us"
      },
      {
        "href": "#try-free",
        "label": "Try a free demo",
        "trial": true
      }
    ]
  }
];

export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { href: "/privacy-policy/", label: "Privacy policy" },
  { href: "/terms-of-service/", label: "Terms of service" },
  { href: "/cookie-policy/", label: "Cookie policy" },
];
