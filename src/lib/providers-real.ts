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
    slug: "sami-s-brow-and-lashes",
    name: "Sami's Brow and Lashes",
    city: "Kathmandu",
    region: "Nepal",
    location: "Lazimpat, Kathmandu",
    areas: ["Lazimpat"],
    modality: "Lashes & Brows",
    modalities: ["Lashes & Brows", "Nails"],
    rating: 0,
    reviewCount: 0,
    isNew: true,
    isRecommended: false,
    tone: "linear-gradient(160deg, #e6d4cd, #c9a89c)",
    image: "/images/providers/sami-s-brow-and-lashes/hero-reception.webp",
    // The team photo (gallery-team.webp) is deliberately NOT used until Sami's owner confirms we may show their staff.
    gallery: [
      "/images/providers/sami-s-brow-and-lashes/hero-reception.webp",
      "/images/providers/sami-s-brow-and-lashes/gallery-brow-lift.webp",
      "/images/providers/sami-s-brow-and-lashes/gallery-lash-lift.webp",
      "/images/providers/sami-s-brow-and-lashes/gallery-brow-tint.webp",
      "/images/providers/sami-s-brow-and-lashes/gallery-nail-extension.webp",
      "/images/providers/sami-s-brow-and-lashes/gallery-henna.webp",
    ],
    intro: [],
    greatFor: [],
    features: [],
    serviceCategories: ["Mani & Pedi", "Brows", "Lash Lift / Tint", "Nails", "Value Pack (Brows & Lashes)", "Lash Extensions - Full Set", "Cosmetic Brow Tattoo (SPMU)", "Cosmetic Brow Touch Ups", "Lip Blush", "Add-On Threading", "Nail Refills"],
    // All 53 real services from the PROD bookX org "samis" (public_get_bookable_services), grouped by
    // category. A snapshot: the booking flow reads the live catalog.
    services: [
      { id: "f37b9a44-4b84-4f54-b823-a564ee7993da", name: "Classic Manicure", category: "Mani & Pedi", durations: [45], price: 1500, description: "Revitalize your hands with a classic manicure that’s perfect for any occasion. This treatment includes nail shaping, cuticle care, and a choice of vibrant polish shades to complement your style. Enjoy a relaxing experience as our skilled professionals pamper your hands, ensuring they look beautiful and feel refreshed. Treat yourself to a little luxury and let your nails shine!\nFor a truly luxurious finish, add soft gel for an additional 1200 Rs and indulge in the ultimate self-care experience today." },
      { id: "3aafb661-61f6-4475-b830-1be82c86985b", name: "Classic Pedicure", category: "Mani & Pedi", durations: [60], price: 2000, description: "Experience the elegance of a classic pedicure that refreshes your feet and enhances your nails. Our Classic Pedi includes a soothing soak, gentle exfoliation, and meticulous nail shaping. Perfect for a little self-care, this treatment leaves your toes looking beautiful and well-groomed. Treat yourself today at Sami’s Brow and Lashes.\nFor a truly luxurious finish, add soft gel for an additional 1000 Rs and indulge in the ultimate self-care experience today." },
      { id: "89014366-0e17-4c44-b946-1252af7dd9bd", name: "Deluxe manicure", category: "Mani & Pedi", durations: [60], price: 2300, description: "Indulge in a luxurious nail experience with our Delux mani service, featuring high-quality gel polish for a stunning and long-lasting finish. Enjoy a careful attention to detail as our skilled technicians transform your nails into a canvas of creativity and elegance. Choose from a variety of colors and designs to express your unique style. Experience the perfect blend of relaxation and beauty at Sami's brow and lashes. Treat yourself and elevate your nail art game!\nFor a truly luxurious finish, add soft gel for an additional 1200 Rs and indulge in the ultimate self-care experience today." },
      { id: "89f931c1-cef4-486d-8523-d242fe2bd59d", name: "Deluxe Pedicure", category: "Mani & Pedi", durations: [90], price: 2600, description: "Indulge your senses with our luxurious deluxe pedicure, designed for the ultimate pampering experience. Enjoy a soothing soak, gentle exfoliation, and a calming massage that rejuvenates both your feet and spirit. This treatment includes expert nail care, and to elevate your experience further, we add a delightful jelly treatment that enhances relaxation. Treat yourself to the relaxation you deserve at Sami's Brow and Lashes.\nFor a truly luxurious finish, add soft gel for an additional 1000Rs and indulge in the ultimate self-care experience today." },
      { id: "c3ab5736-8a97-4383-9288-c2284da99a88", name: "Luxury Manicure", category: "Mani & Pedi", durations: [60], price: 2500, description: "Elevate your self-care routine to an extraordinary level with our luxury manicure. This deluxe treatment revitalizes and nurtures your hands, leaving them impeccably manicured and irresistibly smooth. Indulge in our exquisite Bombini mani set, designed to pamper you from fingertips to wrist. Enjoy a relaxing experience as your hands shine with elegance and grace. \nFor a truly luxurious finish, add soft gel for an additional 1200 Rs and indulge in the ultimate self-care experience today." },
      { id: "ae30ebc9-bdad-4496-bd5b-d52554666320", name: "Luxury Pedicure", category: "Mani & Pedi", durations: [90], price: 3200, description: "Treat your feet to an extraordinary relaxation experience with our luxurious pedicure. Delight in precise nail care, gentle exfoliation, and a calming massage that revives and pampers your feet. This deluxe treatment features the exclusive Bombini Ice Cream Pedi Set for a truly indulgent sensory experience. Embrace serenity and treat yourself to a touch of luxury; your feet deserve the best. \nFor an added pampering touch, soft gel can be included for an additional 1000 NPR." },
      { id: "a4e6981f-9e02-4693-9815-24e0dcc7f876", name: "Brow Lamination", category: "Brows", durations: [60], price: 3499, description: "Get full, fluffy, and perfectly styled brows. \nWe begin with a personalized consultation to determine the level of fullness and fluffiness you want to achieve based on your natural hair growth. We then apply a gentle lifting solution to relax and redirect your brow hairs into a sleek, brushed-up look that covers gaps and maximizes volume, finishing with a hydrating formula to keep your brows nourished." },
      { id: "a4760c88-3702-413d-a1f3-59a5e330927e", name: "Brow Lamination + ST / HD Brows - From", category: "Brows", durations: [75], price: 4199, description: "The ultimate all-in-one brow transformation for fully sculpted, styled, and defined brows. \nYour appointment begins with a detailed consultation to assess your brow goals and natural hair texture. We then lift and set the hairs with brow lamination, followed by custom facial mapping and threading to create the perfect shape for your features. To finish, choose between our Sculpting Tint for a soft, natural enhancement or Hybrid Dye for a bold, ultra-defined finish." },
      { id: "8746f990-b77f-4a0e-9b1f-5565ce1fd777", name: "Brows Shaping Including Mapping", category: "Brows", durations: [30], price: 349, description: "We believe your brows should be as unique as your facial features. Your appointment begins with a thorough consultation to discuss your brow goals. Using precise facial mapping, we design perfect symmetry for your face shape and use expert threading to cleanly sculpt them into your ultimate desired shape." },
      { id: "3a1f7556-c18c-4b88-91a0-7601bf1dec26", name: "High Definition Brows (HD Brows)", category: "Brows", durations: [45], price: 1299, description: "The ultimate high-definition brow makeover for a bold, crisp, low-maintenance look. \nAfter a detailed consultation and custom facial mapping, we expertly thread and sculpt the brows before applying a premium hybrid dye to stain the skin and tint the hairs for a flawless, long-lasting finish." },
      { id: "215d735b-5625-4a49-87a2-4ef729a73509", name: "Highly Defining Dye", category: "Brows", durations: [30], price: 999, description: "Take your brow color to the next level with our premium hybrid dye for a rich, long-lasting “filled-in” brow look. \nYour appointment begins with a personalized consultation to determine your ideal intensity and custom color blend. The hybrid dye is then applied to stain the skin for up to a week and tint the brow hairs for up to 2–3 weeks, leaving your brows bold, defined, and effortlessly polished.\n\nNote: This is a dye-only service and does not include shaping or hair removal." },
      { id: "eaf65e32-3b12-4a42-885c-9720933cd558", name: "Sculpt Brows (ST Brows)", category: "Brows", durations: [45], price: 1099, description: "Our signature all-in-one brow transformation begins with a personalized consultation to understand your ideal brow shape, thickness, and style. \nUsing precise facial mapping, we create a custom brow shape tailored to complement your unique features and bone structure. We then expertly thread the brows to sculpt and define the shape before finishing with our custom-blended sculpting tint for added depth, definition, and long-lasting enhancement." },
      { id: "8ec1c2e1-9e56-447d-8830-e41dae38d72c", name: "Sculpting Tint", category: "Brows", durations: [30], price: 799, description: "Perfect way to add depth, definition, and the illusion of thickness to your brows.\nEvery appointment begins with a personal consultation to discuss your brow goals and select the perfect shade to complement your hair color and skin tone. Then we proceed to apply rich brow tint that colors the brow hairs and leaves a soft, natural stain on the skin to fill in gaps for a fuller, bolder look. \n\nNote: This is a tint-only service and does not include brow shaping." },
      { id: "da06171d-aea6-4abb-bec7-7960ce822bf1", name: "Lash Lift", category: "Lash Lift / Tint", durations: [60], price: 3499, description: "Enhance your natural lashes with a lifted, curled effect that opens and brightens the eyes. \nYour appointment begins with a consultation to determine your desired curl and lash style. We then gently lift and set your natural lashes using a professional lifting solution, finishing with a nourishing treatment for healthy, beautifully defined lashes." },
      { id: "8ec866c9-aa4a-4e26-9712-88e4151377c0", name: "Lash Lift With Tint", category: "Lash Lift / Tint", durations: [75], price: 4199, description: "The perfect low-maintenance lash enhancement for darker, lifted, and more defined lashes. \nAfter a personalized consultation, we lift and curl your natural lashes before applying a custom lash tint to deepen the color and create a mascara-like effect without daily makeup. Finished with a nourishing treatment for soft, healthy lashes." },
      { id: "54563f84-f70d-4bcf-8bce-2cee18a408f1", name: "Lash Tint", category: "Lash Lift / Tint", durations: [15], price: 799, description: "Enhance your natural lashes with a deep, custom tint for a darker, more defined look. This quick treatment adds richness and visibility to your lashes, creating a naturally mascara-like effect without daily makeup." },
      { id: "d4b24d70-566b-41b3-b2ca-31fcdbd02400", name: "Feet extension", category: "Nails", durations: [90], price: 3000, description: "Transform your pedicure experience with stunning feet extensions designed to enhance the beauty of your nails. Enjoy a polished, elegant look that lasts, perfect for all occasions where you want to stand out. Let your feet shine with elegance and style, highlighting your personal flair effortlessly." },
      { id: "c1e9ad53-f16f-464a-9f43-b00d2cd65e00", name: "Feet Soft Gel", category: "Nails", durations: [60], price: 2000, description: "Transform the look of your toes with our rejuvenating gel infill service. This treatment helps refresh and maintain the appearance of your nails, ensuring they stay beautiful and vibrant. Experience the pampering touch that leaves your feet looking and feeling their best." },
      { id: "80ddab82-acc3-4f2b-b666-3253dac5b871", name: "Gel Nail Extensions", category: "Nails", durations: [120], price: 3000, description: "" },
      { id: "95b32302-3ce9-4d02-9311-3e5cf9ee0a27", name: "Gel Nails Removal", category: "Nails", durations: [45], price: 1000, description: "" },
      { id: "ee6baab3-81d5-4a7e-b74b-dad9330c864a", name: "Gel Overlay", category: "Nails", durations: [90], price: 2500, description: "" },
      { id: "1ddd67ac-e739-4e63-bb5e-a4914578fb13", name: "Gel X", category: "Nails", durations: [90], price: 2500, description: "Step into a world of vibrant elegance with our Gel X service. This long-lasting gel polish enhances your nails while showcasing beautiful colors and intricate designs. Enjoy the perfect blend of strength and style, ensuring your manicure is a true reflection of your personality. While Gel X may not last as long as traditional nail extensions, it offers a stunning finish that keeps your nails looking fresh and fabulous. Discover your bold aesthetic with us today." },
      { id: "286066e0-b0b5-47f5-90f9-0624d4228f60", name: "Soft Gel", category: "Nails", durations: [60], price: 1500, description: "" },
      { id: "a43262f3-caf1-47cf-8709-f42b7a727f0c", name: "Brow Lamination + ST / HD Brows + Lash Lift + Tint - From", category: "Value Pack (Brows & Lashes)", durations: [120], price: 7999, description: "A complete brow and lash makeover for maximum definition and symmetry. \nWe start with brow lamination to lift and set the hairs into place, followed by precise brow shaping and either Sculpting Tint or Hybrid Dye for customized color. A lash lift and tint complete the look, giving you fuller-looking brows and beautifully enhanced lashes." },
      { id: "a6d84d44-37d4-46e5-b013-e32b492b4400", name: "ST / HD Brows + Lash Lift +Tint - From", category: "Value Pack (Brows & Lashes)", durations: [120], price: 4999, description: "The ultimate brow and lash combo for a fully defined, eye-opening transformation. We begin with expert brow shaping using either Sculpting Tint (ST) or Hybrid Dye (HD Brows), followed by a lash lift to curl and enhance your natural lashes. The treatment is completed with a lash tint for added depth, creating perfectly balanced, polished results." },
      { id: "af984be5-e079-4ab5-a4eb-ca659e6b89d7", name: "Classic Lash Extension", category: "Lash Extensions - Full Set", durations: [120], price: 3000, description: "Your appointment begins with a consultation to design a look that complements your natural lashes and eye shape. \nClassic lashes involve applying one extension to each natural lash, enhancing length, definition, and curl for a clean, natural finish." },
      { id: "910bf9d3-1f20-43a0-a893-1ff5ced1d63a", name: "Full Volume Lash Extensions", category: "Lash Extensions - Full Set", durations: [180], price: 5000, description: "Your service starts with a personalized consultation to tailor the shape and fullness to your eye structure and style preference. \nFull Volume lashes use lightweight volume fans to create a dense, fluffy, and glamorous finish while maintaining softness and comfort." },
      { id: "e8d8f42f-3557-4048-900a-6ec11dc4ce45", name: "Lash extension refill - From", category: "Lash Extensions - Full Set", durations: [120], price: 1000, description: "Revitalize your appearance with a lash extension refill that preserves the beauty and health of your extensions. This service is perfect for maintaining full, fabulous lashes by seamlessly filling in any gaps caused by the natural shedding of your lashes. Experience a remarkable boost in volume and length while keeping your lashes in optimal condition. Enjoy a personalized treatment tailored just for you, ensuring you leave feeling confident and stunning. Pricing ranges from 1000 to 3500, depending on your lash retention and growth." },
      { id: "20702c37-a60c-4fd9-b2ca-bd0a157c750b", name: "Lash Extension Removal", category: "Lash Extensions - Full Set", durations: [30], price: 500, description: "Experience a gentle and safe way to remove your classic lash extensions. Your appointment starts with a brief consultation to evaluate the health of your natural lashes and select the most effective removal method. Using professional-grade solutions, we carefully dissolve your lash extensions, ensuring your natural lashes remain unharmed, clean, and healthy. \nIf you recently received a new set of lashes from us, enjoy complimentary removal service before your next application." },
      { id: "040b0dc5-684c-45ab-8446-032f51d816e5", name: "Mega Volume Lash Extensions", category: "Lash Extensions - Full Set", durations: [210], price: 6000, description: "Begin your appointment with a detailed consultation to understand your desired level of drama, density, and eye shape enhancement. \nMega Volume sets are designed using ultra-fine handcrafted fans to create maximum fullness, bold darkness, and high-impact definition for a dramatic, statement look." },
      { id: "27514219-dc7f-4310-83f5-ed6adc259f08", name: "Mid Volume Lash Extensions", category: "Lash Extensions - Full Set", durations: [150], price: 4500, description: "We begin with a consultation to determine your ideal balance of natural and enhanced volume. \nMid Volume lashes combine individual and volume fans to create a fuller yet wearable look with soft definition and everyday versatility." },
      { id: "a781ded7-5603-47ae-b159-8456a81a4153", name: "Natural Volume Hybrid", category: "Lash Extensions - Full Set", durations: [150], price: 3500, description: "We start with a consultation to assess your desired texture, fullness, and style. \nHybrid lashes blend classic and volume techniques to create a soft, textured set that enhances both definition and natural fullness." },
      { id: "1e467bdf-e2e2-4f8e-9e3c-411fadfb673e", name: "Russian Lash Extension", category: "Lash Extensions - Full Set", durations: [180], price: 5500, description: "Enhance your natural beauty with stunning Russian Lash Extensions that offer a luxurious, full look. This service involves applying delicate, lightweight extensions that create volume and length, making your eyes pop and reducing the need for daily makeup. Embrace effortless elegance today!" },
      { id: "fe67f0a2-2127-4502-9377-57e127c493f7", name: "Wispy / Anime", category: "Lash Extensions - Full Set", durations: [180], price: 5000, description: "Begin with a consultation to design your ideal lash map, focusing on shape, texture, and intensity. \nWispy lashes combine structured volume with longer spikes to create a soft, fluttery, and eye-opening effect with a textured finish." },
      { id: "bdf0ab60-dff5-49e3-bcce-a015d490397c", name: "Combo Brows", category: "Cosmetic Brow Tattoo (SPMU)", durations: [210], price: 34999, description: "We begin with a thorough consultation to customize shape, density, and style based on your features. \nCombo brows combine realistic hair strokes with soft shading to achieve a defined yet natural look, adding both structure and dimension." },
      { id: "50cd682a-9d13-45a7-a468-cdbf669a6ff5", name: "Nano Brows", category: "Cosmetic Brow Tattoo (SPMU)", durations: [210], price: 34999, description: "We begin with an in-depth consultation to understand your brow goals, facial structure, and desired level of softness. \nNano brows are created using ultra-fine hair strokes with a nano needle, designed to replicate natural brow hairs for a soft, realistic, and highly detailed finish." },
      { id: "e81c9a54-80a2-4b29-aadb-7d7b715f16f2", name: "Shading", category: "Cosmetic Brow Tattoo (SPMU)", durations: [180], price: 31999, description: "Your appointment starts with a detailed consultation and brow mapping to design your ideal shape and intensity. This soft powder technique creates a gently shaded, makeup-like effect, adding depth, definition, and a smooth gradient finish for fuller-looking brows." },
      { id: "e04db08a-e3ad-4829-a525-6833bffeb962", name: "Cosmetic Brow Touch Ups 1 + Year", category: "Cosmetic Brow Touch Ups", durations: [210], price: 24999, description: "We begin with an in-depth consultation to reassess your brow shape and colour goals. \nThis full refresh restores pigment intensity, refines shape, and revives overall definition for long-lasting, renewed brows." },
      { id: "0cd64a1c-45fc-4880-9dd9-19d182fad360", name: "Cosmetic Brow Touch Ups 4 - 8 Weeks", category: "Cosmetic Brow Touch Ups", durations: [120], price: 4999, description: "Your appointment begins with a consultation and brow assessment to evaluate healing and pigment retention. This perfecting session refines shape, colour, and density to ensure even, long-lasting results." },
      { id: "f8612f63-7155-4b5c-9c87-8ce6883dc871", name: "Cosmetic Brow Touch Ups 6 month", category: "Cosmetic Brow Touch Ups", durations: [180], price: 14999, description: "Your appointment begins with a detailed consultation to assess fading and overall brow condition. \nThis colour boost restores vibrancy, sharpness, and definition while maintaining a natural finish." },
      { id: "25103d00-b807-4b77-9769-9bc99014bcf7", name: "Cosmetic Brow Touch Ups 8 - 12 Weeks", category: "Cosmetic Brow Touch Ups", durations: [120], price: 7499, description: "We start with a consultation to review healed results and identify areas for enhancement. \nThis session refreshes pigment, balances tone, and perfects shape for a consistent, polished finish." },
      { id: "45129818-60b0-4c13-ba2f-8e498064ed01", name: "Lip Blush (1st session)", category: "Lip Blush", durations: [180], price: 20000, description: "Your appointment begins with a detailed consultation to design your ideal lip tone, shape, and enhancement level. \nLip blush is a semi-permanent treatment that softly enhances natural lip colour, improves symmetry, and creates a smooth, healthy-looking tint." },
      { id: "26263521-ea72-4bf0-b2b6-76877cbbbc47", name: "Touch UP After 1 Year", category: "Lip Blush", durations: [180], price: 15000, description: "Your appointment starts with a consultation to evaluate fading and desired refresh level. \nThis touch-up restores colour vibrancy, sharpness, and overall definition to maintain beautifully enhanced lips." },
      { id: "867a9cda-0d8c-41db-9af0-8bb6e0ff9702", name: "Touch UP Within 12 Weeks", category: "Lip Blush", durations: [120], price: 10000, description: "We begin with a consultation to assess healing and pigment development. \nThis session perfects colour, evens out tone, and refines shape for a smooth, long-lasting result." },
      { id: "b3559abf-bbd3-4545-9e4f-bcf94c7ef6df", name: "Chin", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "cc873534-263c-49a6-88d9-ed69d3e8fe63", name: "Forehead", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "400b784e-ed07-4d1c-bd08-5b679c2ca826", name: "Full Face", category: "Add-On Threading", durations: [30], price: 599, description: "Note: Doesn’t include eyebrow mapping and shaping" },
      { id: "60e432b4-c40f-4d1a-99ee-e7d5f54a4461", name: "Neck", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "de8bf486-e552-470f-a9be-1019359cd320", name: "Rejuvenating Gel Mask - From", category: "Add-On Threading", durations: [15], price: 249, description: "" },
      { id: "db8d903d-0628-4f0f-b081-ce944771d07f", name: "Sides", category: "Add-On Threading", durations: [15], price: 149, description: "" },
      { id: "f2af2e8b-7bee-4ea4-ba09-c1def8416fb4", name: "Upper Lip", category: "Add-On Threading", durations: [15], price: 99, description: "" },
      { id: "487af187-ebbf-43f6-9dd2-517b1de83c35", name: "Gel Extension Refill", category: "Nail Refills", durations: [120], price: 2500, description: "" },
      { id: "6c9bbbf7-b7f2-404c-911c-10d92b579952", name: "Gel Overlay Nails", category: "Nail Refills", durations: [120], price: 2500, description: "" },
    ],
    included: [],
    addOns: [],
    amenities: [],
    // The one real branch (Lazimpat) as shown in bookX. The 9-8 hours are bookX's default placeholder, not
    // verified opening hours: Sami's owner has not given real schedules yet.
    address: "Lazimpat Rd, Kathmandu, Bagmati Province 44600",
    hours: [{ day: "Every day", open: "9:00 am – 8:00 pm" }],
    nearby: [],
    reviewSummary: "",
    reviews: [],
    fromPrice: 99,
    engineProviderId: "samis",
  },
];
