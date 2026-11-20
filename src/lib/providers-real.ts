import type { Provider } from "./providers";

/**
 * Real, book-spa-connected providers — NOT generated placeholder content. Deliberately kept
 * separate from providers-seed.ts (the per-modality template generator) so nobody mistakes
 * fabricated demo studios for real businesses or vice versa. prisma/seed.ts upserts both lists,
 * but only this one represents an actual Zennly customer.
 *
 * Sourced read-only from book-spa's staging Supabase project (ref snzcckzfmpboeqkktmwy) via its
 * public anon RPCs (public_get_bookable_services) and plain table reads (organizations, branches)
 * — see docs/booking-integration-plan.md and the engine-reachability spike it called for. Real
 * names, real outlets, real NPR prices. Snapshotted at the time this file was written: book-spa's
 * actual catalog/pricing can change after this point, and nothing here re-syncs automatically —
 * Stage 2 of the plan is what makes this live instead of a snapshot.
 *
 * Deliberately NOT fabricated for either business: rating, reviewCount, reviews, reviewSummary,
 * intro, greatFor are all left empty/zero. Inventing a star rating or testimonial text for a
 * real, named company would be publishing a false claim about them — unacceptable regardless of
 * this being staging data. The UI must degrade gracefully with a zero rating and empty arrays;
 * checked provider-shell, booking-card, hero and search/collection cards for this.
 *
 * Each catalog is ~50-200 real services; a representative sample (up to 2 per category) is kept
 * here rather than the full list, so the provider page stays a reasonable size. This is a
 * curation-for-display choice, not a fabrication — every service listed is real, with its real
 * engine id, name, duration and price. The full live catalog is what Stage 2's engine read
 * would show at booking time.
 */

/** Same shape prisma/seed.ts upserts providers-seed.ts rows with, plus the engine link. */
export type RealProvider = Provider & { engineProviderId: string };

export const realProviders: RealProvider[] = [
  {
    slug: "nuad-thai-spa",
    name: "Nuad Thai Spa",
    city: "Kathmandu",
    region: "Nepal",
    // Four real, active outlets in book-spa staging (Bhaisepati, Lazimpat, Sanepa, Thamel) — one
    // more than this integration was originally briefed on; trusted the live data. Provider has a
    // single address/lat/lng, so Lazimpat (returned first by the engine) stands in as the single
    // representation. All four are now FINDABLE via `areas` below — that does not settle the
    // multi-outlet schema question (one page, one address, one pin per studio still), it just
    // stops search denying three outlets exist. Booking was already branch-aware: the drawer
    // shows a location step whenever a connected provider has more than one branch.
    location: "Lazimpat, Kathmandu",
    // The four live, is_active outlets in book-spa (org 00000000-...-0001), read from its
    // `branches` table rather than copied from the comment above. "Lalitpur" is listed too
    // because Sanepa and Bhaisepati are in that municipality, not Kathmandu, and someone there
    // searching their own city should find this studio. `city` stays Kathmandu: that is the
    // studio's seat and what the Destination rail counts.
    areas: ["Lazimpat", "Thamel", "Sanepa", "Bhaisepati", "Lalitpur"],
    modality: "Massage",
    modalities: ["Massage"],
    rating: 0,
    reviewCount: 0,
    isNew: true,
    isRecommended: false,
    tone: "linear-gradient(160deg, #cfd9c9, #a9b89f)",
    image: "/images/providers/nuad-thai-spa/hero.jpg",
    gallery: [
      "/images/providers/nuad-thai-spa/hero.jpg",
      "/images/providers/nuad-thai-spa/lazimpat.jpg",
      "/images/providers/nuad-thai-spa/sanepa.jpg",
      "/images/providers/nuad-thai-spa/bhaisepati.jpg",
      "/images/providers/nuad-thai-spa/thamel.jpg",
    ],
    intro: [],
    greatFor: [],
    features: [],
    serviceCategories: [
      "Spa",
      "Hair Color",
      "Hair Treatment",
      "Waxing",
      "Packages",
      "Salon",
      "Facial",
      "Threading",
      "Wellness",
      "Other",
      "Nail",
      "Offer",
    ],
    services: [
      { id: "79b0178d-a83a-4b91-80b6-5666a2c5eed0", name: "BANGKOK PACKAGE - 120min", category: "Spa", durations: [120], price: 8200, description: "" },
      { id: "52ef6c93-9b13-4bfe-9723-4ff855efb134", name: "BANGKOK PACKAGE - 90min", category: "Spa", durations: [90], price: 6600, description: "" },
      { id: "0d2a8001-e701-48c9-aada-c2392154026d", name: "COLOR TOUCH UP - Root Touchup", category: "Hair Color", durations: [60], price: 1700, description: "" },
      { id: "638f6c00-16af-4e76-9199-3d008e557dfc", name: "COLOR TOUCH UP - Root Touchup (Ammonia Free)", category: "Hair Color", durations: [60], price: 2200, description: "" },
      { id: "7dc0c0bb-3c17-46de-8579-2fe0ba486410", name: "HAIR BOND TREATMENT - Long Hair", category: "Hair Treatment", durations: [60], price: 3000, description: "" },
      { id: "ffbcff42-252b-4484-b6ab-50543c5fe4cc", name: "HAIR BOND TREATMENT - Medium Hair", category: "Hair Treatment", durations: [45], price: 2500, description: "" },
      { id: "bc25fc90-bae6-4edc-b470-5874ddef45dc", name: "Premium Hair Waxing - Bikini Line", category: "Waxing", durations: [20], price: 1500, description: "" },
      { id: "eb469c84-f06b-453f-80e6-5d2dfa23f7ba", name: "Premium Hair Waxing - Brazilian/Bikini Wax", category: "Waxing", durations: [45], price: 4000, description: "" },
      { id: "a0c83d64-9a41-4f49-9b41-39351e9fd4db", name: "Annual Package - 120 min", category: "Packages", durations: [120], price: 64480, description: "" },
      { id: "89a41903-ceb5-4206-b55e-0ff90654b01f", name: "Annual Package - 60 min", category: "Packages", durations: [60], price: 35280, description: "" },
      { id: "b94f6eac-867f-4af3-8f12-0b8ffecd62cd", name: "Men - Beard Color", category: "Salon", durations: [30], price: 1500, description: "" },
      { id: "7fd66d80-a11a-41c4-9414-5f968643ea8f", name: "Men - Beard Style", category: "Salon", durations: [15], price: 200, description: "" },
      { id: "a1fe6452-4c75-4919-96db-fd651e1140da", name: "Facial - Acnex (Advanced pimple & acne treatment)", category: "Facial", durations: [45], price: 2500, description: "" },
      { id: "a02a464c-d07e-4a4a-8174-3d1f5a0bfea1", name: "Facial - Dipigmentone (Pigmentation and spots)", category: "Facial", durations: [45], price: 2500, description: "" },
      { id: "ec7c1782-27e0-4b98-b816-e334fb6641e6", name: "Threading - Chin", category: "Threading", durations: [5], price: 150, description: "" },
      { id: "2644a183-b3b8-4766-a6b2-9af158e2a4db", name: "Threading - Eyebrows", category: "Threading", durations: [10], price: 200, description: "" },
      { id: "77ae53c2-c241-4b63-ac63-b5cac2a514e6", name: "HERBAL BALL COMPRESS (2 pc)", category: "Wellness", durations: [30], price: 1900, description: "" },
      { id: "15c5deda-c0fe-495f-ab5a-05b83512a3f9", name: "HERBAL BALM", category: "Wellness", durations: [10], price: 500, description: "" },
      { id: "4bb46c66-c583-44fb-85db-debea731cbee", name: "Deep Tissue (Add-on)", category: "Other", durations: [15], price: 200, description: "" },
      { id: "feef818c-618d-48eb-bb37-da877c085989", name: "Products", category: "Other", durations: [10], price: 1000, description: "" },
      { id: "ee371c26-353a-4b03-9638-68155e869038", name: "Gel Polish Removal", category: "Nail", durations: [15], price: 500, description: "" },
      { id: "e18a6b45-7147-4b82-8a88-cf9820873c19", name: "NUAD THAI NORMAL GEL POLISH", category: "Nail", durations: [45], price: 2000, description: "" },
      { id: "318c7868-3f46-481d-8695-4a847be54fea", name: "Bold transformation", category: "Offer", durations: [150], price: 6800, description: "" },
    ],
    included: [],
    addOns: [],
    amenities: [],
    // Lazimpat branch's real hours from book-spa, shared across all four outlets in the data.
    address: "Lazimpat Road, Kathmandu 44600, Nepal",
    hours: [{ day: "Every day", open: "9:00 am – 9:00 pm" }],
    nearby: [],
    reviewSummary: "",
    reviews: [],
    fromPrice: 150,
    engineProviderId: "nuad-thai-spa",
  },
  {
    slug: "sbal",
    // "sbal" is an internal abbreviation, not the business's name. It stays as the slug (it is in
    // URLs, the /images/providers/sbal/ paths, and engineProviderId must keep matching book-spa's
    // org slug) — but customers must see the real name.
    name: "Sami's Brow and Lashes",
    city: "Kathmandu",
    region: "Nepal",
    location: "Panipokhari, Kathmandu",
    modality: "Lashes & Brows",
    modalities: ["Lashes & Brows", "Nails"],
    rating: 0,
    reviewCount: 0,
    isNew: true,
    isRecommended: false,
    tone: "linear-gradient(160deg, #e6d4cd, #c9a89c)",
    image: "/images/providers/sbal/hero.webp",
    gallery: ["/images/providers/sbal/hero.webp", "/images/providers/sbal/logo.webp"],
    intro: [],
    greatFor: [],
    features: [],
    serviceCategories: [
      "Brows",
      "Lash Lift / Tint",
      "Value Pack (Brows & Lashes)",
      "Lash Extensions",
      "Cosmetic Brow Tattoo (SPMU)",
      "Cosmetic Brow Touch Ups",
      "Lip Blush",
      "Add-On Threading",
      "Mani & Pedi",
      "Nails",
      "Nail Refills",
    ],
    services: [
      { id: "bb464091-e2cd-423a-9c32-d6926c5fb13c", name: "Brow Lamination", category: "Brows", durations: [60], price: 3499, description: "Lifts and redirects brow hairs into a full, fluffy, brushed-up look." },
      { id: "4324604b-8d9b-4db5-b430-5aa2b5447ff4", name: "Brow Lamination + ST / HD Brows", category: "Brows", durations: [75], price: 4199, description: "Brow lamination plus a Sculpting Tint or Hybrid Dye finish." },
      { id: "e54dd74c-52af-4457-8935-a8ab2085686b", name: "Lash Lift", category: "Lash Lift / Tint", durations: [60], price: 3499, description: "Lifted, curled lash effect that opens and brightens the eyes." },
      { id: "14c3efa3-371c-4bfa-8560-02846585656c", name: "Lash Lift With Tint", category: "Lash Lift / Tint", durations: [75], price: 4199, description: "Lash lift plus a custom tint for a mascara-like effect." },
      { id: "7cd0112e-62d6-42eb-8e12-9006c80b29a6", name: "Brow Lamination + ST / HD Brows + Lash Lift + Tint", category: "Value Pack (Brows & Lashes)", durations: [120], price: 7999, description: "Full brow and lash makeover: lamination, shaping, lift, and tint." },
      { id: "d14a7ea4-d158-40e8-9499-c1fb7485a863", name: "ST / HD Brows + Lash Lift + Tint", category: "Value Pack (Brows & Lashes)", durations: [120], price: 4999, description: "Brow shaping (ST or HD) combined with a lash lift and tint." },
      { id: "8402c48a-c4bd-4bf2-ac5c-6194897aaf58", name: "Classic Lash Extension", category: "Lash Extensions", durations: [120], price: 3000, description: "One extension per natural lash for a clean, natural finish." },
      { id: "d22ccf17-54a2-4f4e-8c01-7e838a33f05a", name: "Full Volume Lash Extensions", category: "Lash Extensions", durations: [180], price: 5000, description: "Lightweight volume fans for a dense, fluffy, glamorous finish." },
      { id: "ba64b5f8-e5f1-4389-bddf-264a98e19276", name: "Combo Brows", category: "Cosmetic Brow Tattoo (SPMU)", durations: [210], price: 34999, description: "Realistic hair strokes combined with soft shading." },
      { id: "0095be53-83ef-41a5-bcd7-264a925f9655", name: "Nano Brows", category: "Cosmetic Brow Tattoo (SPMU)", durations: [210], price: 34999, description: "Ultra-fine hair-stroke nano needle technique for a soft, realistic finish." },
      { id: "cb372fa2-cb3b-4b85-8023-57c8241b2f6a", name: "Cosmetic Brow Touch Ups 1 + Year", category: "Cosmetic Brow Touch Ups", durations: [210], price: 24999, description: "Full refresh restoring pigment intensity and shape." },
      { id: "fc445a7f-375e-4d8f-b94a-cc6754bbaac0", name: "Cosmetic Brow Touch Ups 4 - 8 Weeks", category: "Cosmetic Brow Touch Ups", durations: [120], price: 4999, description: "Perfecting session refining shape, colour, and density after healing." },
      { id: "35019766-ac5e-459f-8e24-4daef18e1682", name: "Lip Blush (1st session)", category: "Lip Blush", durations: [180], price: 20000, description: "Semi-permanent treatment that softly enhances natural lip colour." },
      { id: "9f0212a8-db81-4949-a5bb-d07e3c0aaea7", name: "Touch Up After 1 Year", category: "Lip Blush", durations: [180], price: 15000, description: "Restores colour vibrancy and definition to lip blush." },
      { id: "7bef0ef7-80b5-4d04-b2ea-1dac563df146", name: "Chin", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "ad510789-450e-4b3c-99da-0027235acbd0", name: "Forehead", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "f2e9a59d-a5b4-45de-8e1e-507ca46c0e23", name: "Classic Manicure", category: "Mani & Pedi", durations: [45], price: 1500, description: "Nail shaping, cuticle care, and polish of your choice." },
      { id: "9d00b39f-f0ce-43aa-9fc7-c376d650c187", name: "Classic Pedicure", category: "Mani & Pedi", durations: [60], price: 2000, description: "Soothing soak, exfoliation, nail shaping, and polish." },
      { id: "314ace83-a489-426c-80ab-5a6cde460d73", name: "Feet extension", category: "Nails", durations: [90], price: 3000, description: "Pedicure with feet extensions for an elegant, long-lasting look." },
      { id: "c97a8148-3185-4fd6-ae5e-207a5bdd9452", name: "Feet Soft Gel", category: "Nails", durations: [60], price: 2000, description: "Rejuvenating gel infill service for toes." },
      { id: "32c3fe31-d9ec-44cc-bf59-0ca92bacf904", name: "Gel Extension Refill", category: "Nail Refills", durations: [120], price: 2500, description: "" },
      { id: "1a84b19b-8168-4294-8d6e-0067b6cb40c9", name: "Gel Overlay Nails", category: "Nail Refills", durations: [120], price: 2000, description: "" },
    ],
    included: [],
    addOns: [],
    amenities: [],
    // Single real outlet (Lazimpat) in book-spa — no multi-outlet question here.
    address: "Lazimpat Rd, Kathmandu, Bagmati Province 44600",
    hours: [],
    nearby: [],
    reviewSummary: "",
    reviews: [],
    fromPrice: 99,
    engineProviderId: "sbal",
  },
];
