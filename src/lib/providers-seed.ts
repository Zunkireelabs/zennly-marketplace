/**
 * Placeholder provider generator. Its only job now is to produce the rows that
 * `prisma/seed.ts` loads into the database. The app itself reads the database.
 * Copy, prices and reviews are generated from per-modality templates, not live data.
 */

import { slugify, type Provider, type Review, type ReviewTopic, type Service } from "./providers";

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

const IMG = {
  lumen: "/images/mood/unwind-studio-lumen-v2.jpg",
  willow: "/images/mood/unwind-willow-stone-v2.jpg",
  quiet: "/images/mood/unwind-quiet-room.jpg",
  sable: "/images/mood/restore-sable-recovery-v2.jpg",
  northFork: "/images/mood/restore-north-fork-sauna-v2.jpg",
  daniel: "/images/mood/recover-daniel-k-sauna-v2.jpg",
  basalt: "/images/providers/basalt-bloom-v2.jpg",
  hair: "/images/mood/glow-hair-studio-v2.jpg",
  lash: "/images/mood/glow-lash-brow-v2.jpg",
  beauty: "/images/mood/glow-beauty-bar-v2.jpg",
  priya: "/images/mood/center-priya-movement-v2.jpg",
  yoga: "/images/mood/center-quiet-practice-yoga-v2.jpg",
  breath: "/images/mood/center-breathline-breathwork-v3.jpg",
};

type Family = "massage" | "heat" | "cold" | "movement" | "skin" | "hair" | "lash" | "beauty" | "float";

/** Photos that read plausibly for a family. Providers without their own photo borrow from here. */
const FAMILY_IMAGES: Record<Family, string[]> = {
  massage: [IMG.lumen, IMG.willow, IMG.quiet],
  heat: [IMG.northFork, IMG.daniel, IMG.basalt, IMG.sable],
  cold: [IMG.daniel, IMG.sable, IMG.northFork],
  movement: [IMG.priya, IMG.yoga, IMG.breath],
  skin: [IMG.quiet, IMG.lumen, IMG.beauty],
  hair: [IMG.hair, IMG.beauty, IMG.lash],
  lash: [IMG.lash, IMG.beauty, IMG.hair],
  beauty: [IMG.beauty, IMG.lash, IMG.hair],
  float: [IMG.sable, IMG.daniel, IMG.quiet],
};

/* -------------------------------------------------------------------------- */
/* Per-family templates                                                        */
/* -------------------------------------------------------------------------- */

type FamilyTemplate = {
  categories: string[];
  services: Omit<Service, "id">[];
  features: { label: string; detail: string }[];
  greatFor: string[];
  included: string[];
  addOns: { name: string; price: number }[];
  amenities: string[];
  intro: (name: string, city: string) => string[];
  praise: string[];
};

const svc = (
  category: string,
  name: string,
  durations: number[],
  price: number,
  description: string
): Omit<Service, "id"> => ({ category, name, durations, price, description });

const TEMPLATES: Record<Family, FamilyTemplate> = {
  massage: {
    categories: ["Featured", "Massage", "Body rituals", "Add-ons"],
    services: [
      svc("Featured", "Signature Deep Tissue", [60, 90], 95, "Slow, sustained pressure through the back, shoulders and hips."),
      svc("Featured", "Hot Stone Ritual", [75], 120, "Heated basalt stones, warm oil and long, unhurried strokes."),
      svc("Massage", "Swedish Relaxation", [60], 85, "A lighter, flowing massage to settle the nervous system."),
      svc("Massage", "Prenatal Massage", [60], 100, "Side-lying support and gentle pressure, for the second and third trimester."),
      svc("Body rituals", "Salt Scrub + Massage", [90], 140, "A mineral salt exfoliation followed by a full-body oil massage."),
      svc("Body rituals", "Couples Sanctuary", [90], 260, "Two therapists in one quiet room, with tea to finish."),
      svc("Add-ons", "Scalp + Neck Extension", [15], 20, "Fifteen extra minutes of focused work, added to any massage."),
    ],
    features: [
      { label: "Private rooms", detail: "5 treatment rooms" },
      { label: "Shower", detail: "Towels and robes provided" },
      { label: "Tea lounge", detail: "Loose-leaf, on the house" },
      { label: "Free parking", detail: "Behind the building" },
    ],
    greatFor: ["Deep rest", "Sore shoulders", "Couples", "First visit"],
    included: ["Robe and slippers", "Herbal tea before and after", "Shower and towels", "Aromatherapy of your choice"],
    addOns: [
      { name: "Aromatherapy upgrade", price: 15 },
      { name: "Hot towel finish", price: 10 },
      { name: "CBD balm", price: 18 },
    ],
    amenities: ["Private treatment rooms", "Showers", "Tea lounge", "Free parking", "Heated tables", "Wheelchair access", "Locker storage", "Gift cards"],
    intro: (name, city) => [
      `${name} is a small, quiet studio in ${city} built around unhurried, one-to-one bodywork. Every treatment room is warm, dimmed and soundproofed, so the hour feels longer than it is.`,
      `Therapists spend the first few minutes listening, then tailor pressure and pace to how you arrived. Most guests stay a while after, with tea in the lounge and no reason to rush back out.`,
    ],
    praise: [
      "The pressure was exactly right and nobody rushed me. I walked out lighter than I walked in.",
      "Calm, clean and very well run. The room was warm before I even lay down.",
      "Best massage I have had in years. They actually asked about my week before starting.",
      "Booking was easy and the therapist remembered my notes from last time.",
    ],
  },
  heat: {
    categories: ["Featured", "Sauna", "Contrast", "Add-ons"],
    services: [
      svc("Featured", "Private Sauna Session", [60], 55, "A private cedar sauna for one or two, with water and towels."),
      svc("Featured", "Sauna + Cold Plunge Circuit", [90], 85, "Three rounds of heat and cold, guided the first time."),
      svc("Sauna", "Group Sauna (up to 6)", [90], 180, "Book the whole room for friends, with a hot-tea service."),
      svc("Sauna", "Aufguss Ritual", [45], 40, "A hosted steam infusion with aromatic oils, twice each evening."),
      svc("Contrast", "Recovery Contrast Session", [75], 70, "Infrared, steam and a cold rinse in a set sequence."),
      svc("Add-ons", "Guest Pass", [60], 25, "Bring a friend into your booked session."),
    ],
    features: [
      { label: "Cedar sauna", detail: "Wood-fired, 85 – 95°C" },
      { label: "Cold plunge", detail: "Filtered, 4 – 8°C" },
      { label: "Quiet lounge", detail: "Phones off in the room" },
      { label: "Showers", detail: "Private, with amenities" },
    ],
    greatFor: ["Recovery", "Winter days", "Friends", "Stress"],
    included: ["Towel and robe", "Filtered water and herbal tea", "Shower amenities", "First-time orientation"],
    addOns: [
      { name: "Eucalyptus infusion", price: 8 },
      { name: "Robe rental", price: 6 },
      { name: "Cold-pressed juice", price: 9 },
    ],
    amenities: ["Wood-fired sauna", "Cold plunge", "Showers", "Quiet lounge", "Lockers", "Filtered water", "Towel service", "Free parking"],
    intro: (name, city) => [
      `${name} in ${city} is a heat-and-cold house, built for slow afternoons. The sauna is cedar, the plunge is filtered, and the lounge between them is deliberately empty of screens.`,
      `First-time guests get a short walk-through of the circuit. After that, the room is yours. Come for an hour, stay for two.`,
    ],
    praise: [
      "The sauna is the real thing, properly hot with soft light. I slept better that night than I have all month.",
      "Loved the contrast circuit. The staff explained everything without making a fuss.",
      "Spotless and peaceful. The plunge was colder than I expected and I loved it.",
      "Booked it for a group and it worked perfectly. Would come back.",
    ],
  },
  cold: {
    categories: ["Featured", "Cold plunge", "Recovery", "Add-ons"],
    services: [
      svc("Featured", "Guided Cold Plunge", [30], 40, "Breathing, a three-minute plunge, and a warm-up in the lounge."),
      svc("Featured", "Contrast Circuit", [60], 65, "Infrared sauna into cold plunge, twice, with a coach."),
      svc("Cold plunge", "Solo Plunge Session", [30], 30, "Your own private tub and a timer, without guidance."),
      svc("Recovery", "Compression Boots", [30], 35, "Pneumatic leg compression for tired legs."),
      svc("Recovery", "Full Recovery Package", [90], 110, "Plunge, sauna and compression in one sitting."),
      svc("Add-ons", "Breathwork Primer", [15], 15, "A short guided breathing session before you enter the water."),
    ],
    features: [
      { label: "Private tubs", detail: "Chilled to 3 – 10°C" },
      { label: "Infrared sauna", detail: "For contrast rounds" },
      { label: "Coach on site", detail: "Guided first sessions" },
      { label: "Showers", detail: "Hot, with amenities" },
    ],
    greatFor: ["Athletes", "Recovery", "Focus", "First timers"],
    included: ["Towel and changing robe", "Water and electrolytes", "Timer and temperature guide", "Shower access"],
    addOns: [
      { name: "Electrolyte pack", price: 4 },
      { name: "Change of towel", price: 5 },
    ],
    amenities: ["Private plunge tubs", "Infrared sauna", "Showers", "Lockers", "Water and electrolytes", "Compression boots", "Coach on site", "Street parking"],
    intro: (name, city) => [
      `${name} is a cold-water and recovery studio in ${city}. Each plunge tub is private, filtered and temperature-checked before you arrive.`,
      `A coach shows first-timers how to breathe through it, then leaves you to it. Most people leave clear-headed and a little pleased with themselves.`,
    ],
    praise: [
      "Nervous going in, and the coach made it easy. I feel amazing afterwards.",
      "Clean tubs, exact temperatures and a real sense of calm.",
      "A serious recovery setup without any gym attitude.",
      "Great after long runs. The contrast circuit is worth it.",
    ],
  },
  movement: {
    categories: ["Featured", "Classes", "Private", "Add-ons"],
    services: [
      svc("Featured", "Drop-in Class", [60], 28, "Any class on the schedule, mats and props provided."),
      svc("Featured", "First-Week Trial", [60], 49, "Unlimited classes for seven days, for new students."),
      svc("Classes", "Slow Flow", [60], 28, "A steady, breath-led practice for all levels."),
      svc("Classes", "Restorative Evening", [75], 32, "Supported poses held for longer, lit by candle."),
      svc("Private", "Private 1:1 Session", [60], 95, "A practice built around your body and your goals."),
      svc("Private", "Small Group (up to 4)", [60], 160, "Book the room for friends, with a teacher of your choice."),
      svc("Add-ons", "Mat and towel rental", [0], 4, "If you would rather not bring your own."),
    ],
    features: [
      { label: "Bright studio", detail: "Sprung floor, natural light" },
      { label: "Small classes", detail: "Max 12 students" },
      { label: "Props included", detail: "Blocks, bolsters, straps" },
      { label: "Changing rooms", detail: "With showers" },
    ],
    greatFor: ["Beginners", "Flexibility", "Calm", "Regular practice"],
    included: ["Mat, blocks and straps", "Tea after class", "Lockers", "Changing room"],
    addOns: [
      { name: "Mat rental", price: 4 },
      { name: "Towel rental", price: 3 },
      { name: "Eye pillow", price: 0 },
    ],
    amenities: ["Sprung floor", "Props provided", "Showers", "Lockers", "Tea bar", "Bike parking", "Beginner-friendly", "Online classes"],
    intro: (name, city) => [
      `${name} is a light-filled studio in ${city} for people who want a practice they can keep. Classes are small, teachers know your name, and no one is performing.`,
      `Come once as a drop-in, or take the first-week trial to find your rhythm. Private sessions are available if you would like to work on something specific.`,
    ],
    praise: [
      "Welcoming from the first minute. The teacher adjusted everything for my back.",
      "The studio is beautiful and never crowded. I go three times a week now.",
      "Slow, kind and properly taught. Exactly what I needed.",
      "Great mix of levels, and the props are all provided.",
    ],
  },
  skin: {
    categories: ["Featured", "Facials", "Skin treatments", "Add-ons"],
    services: [
      svc("Featured", "Signature Facial", [60], 110, "A tailored cleanse, exfoliation, massage and mask for your skin today."),
      svc("Featured", "Glow Ritual", [75], 145, "Enzyme peel, lymphatic massage and a hydrating mask."),
      svc("Facials", "Clarifying Facial", [60], 105, "Deep cleanse and extractions for congested or oily skin."),
      svc("Facials", "Sensitive Skin Facial", [45], 90, "Fragrance-free products and a very light touch."),
      svc("Skin treatments", "Microcurrent Lift", [60], 160, "Gentle current to tone and lift, best in a series."),
      svc("Add-ons", "LED Light Therapy", [15], 25, "A calming red-light finish for any facial."),
    ],
    features: [
      { label: "Licensed estheticians", detail: "Averaging 8+ years" },
      { label: "Skin consult", detail: "Before every treatment" },
      { label: "Clean products", detail: "Fragrance-free options" },
      { label: "Quiet rooms", detail: "Heated beds, low light" },
    ],
    greatFor: ["Glow", "Sensitive skin", "Special occasions", "Routine care"],
    included: ["Skin consultation", "Cleansing tea", "Take-home care notes", "Heated bed"],
    addOns: [
      { name: "Lip treatment", price: 15 },
      { name: "Eye mask upgrade", price: 18 },
      { name: "Scalp massage", price: 12 },
    ],
    amenities: ["Private treatment rooms", "Heated beds", "Skin consultation", "Clean product line", "Sensitive-skin options", "Parking nearby", "Gift cards", "Series packages"],
    intro: (name, city) => [
      `${name} is a quiet skin studio in ${city}. Every visit begins with a short consultation, so the treatment fits how your skin is right now, not how it was last month.`,
      `The rooms are warm and dim, the products are chosen carefully, and there is no upselling at the end.`,
    ],
    praise: [
      "My skin has never looked better. She explained every step and didn't push products.",
      "Such a calm room. I nearly fell asleep and woke up glowing.",
      "Careful with my sensitive skin, and it showed.",
      "Feels like a proper treatment, not a rushed appointment.",
    ],
  },
  hair: {
    categories: ["Featured", "Cut & style", "Colour", "Treatments"],
    services: [
      svc("Featured", "Cut + Finish", [60], 85, "Consultation, shampoo, precision cut and blow-dry."),
      svc("Featured", "Full Colour", [120, 150], 165, "Single-process colour, gloss and finish."),
      svc("Cut & style", "Blow-dry", [45], 55, "Wash, treat and style, with a lasting finish."),
      svc("Cut & style", "Fringe Trim", [15], 20, "A quick reshape between cuts."),
      svc("Colour", "Balayage", [180, 240], 260, "Hand-painted lightness with a natural grow-out."),
      svc("Treatments", "Scalp + Repair Ritual", [45], 70, "Scalp massage and a bond-repair treatment."),
    ],
    features: [
      { label: "Senior stylists", detail: "Average 10 years" },
      { label: "Consultation", detail: "Included with every visit" },
      { label: "Low-tox colour", detail: "Ammonia-free lines" },
      { label: "Refreshments", detail: "Tea, coffee, sparkling water" },
    ],
    greatFor: ["Fresh cut", "Colour", "Events", "Repair"],
    included: ["Consultation", "Scalp massage at shampoo", "Refreshments", "Take-home styling tips"],
    addOns: [
      { name: "Gloss", price: 35 },
      { name: "Bond repair", price: 30 },
      { name: "Deep-condition", price: 25 },
    ],
    amenities: ["Consultation", "Ammonia-free colour", "Refreshments", "Free wifi", "Street parking", "Gift cards", "Kids welcome", "Late appointments"],
    intro: (name, city) => [
      `${name} is a small, considered hair studio in ${city}. Stylists take time to understand how your hair behaves day to day before a single cut is made.`,
      `Expect an honest consultation, careful colour and a finish that still looks right on day three.`,
    ],
    praise: [
      "Best cut I have had. She really looked at how my hair falls.",
      "Colour is exactly what I asked for and looks natural.",
      "Relaxed, no pressure and lovely to be in.",
      "Worth every dollar. Grows out beautifully.",
    ],
  },
  lash: {
    categories: ["Featured", "Lashes", "Brows", "Add-ons"],
    services: [
      svc("Featured", "Classic Lash Set", [90, 120], 130, "One extension per natural lash for a soft, defined look."),
      svc("Featured", "Brow Lamination + Tint", [60], 85, "Set, shaped and tinted brows that stay put for weeks."),
      svc("Lashes", "Hybrid Lash Set", [120], 155, "A mix of classic and volume for texture and depth."),
      svc("Lashes", "Lash Lift + Tint", [60], 90, "A curl and tint to your own lashes, no extensions."),
      svc("Brows", "Brow Shape + Wax", [30], 40, "A tidy, natural shape with wax and trimming."),
      svc("Add-ons", "Lash Fill (2 – 3 weeks)", [60], 75, "Keep an existing set full."),
    ],
    features: [
      { label: "Certified artists", detail: "Lash and brow specialists" },
      { label: "Patch tests", detail: "Offered for new clients" },
      { label: "Quiet room", detail: "Lie back, eyes closed" },
      { label: "Aftercare", detail: "Written and by text" },
    ],
    greatFor: ["Everyday wear", "Events", "Low maintenance", "First set"],
    included: ["Consultation", "Aftercare guide", "Patch test on request", "Comfortable bed"],
    addOns: [
      { name: "Lower lash tint", price: 12 },
      { name: "Lash bath", price: 10 },
      { name: "Removal", price: 25 },
    ],
    amenities: ["Private rooms", "Patch tests", "Aftercare kit", "Heated beds", "Street parking", "Gift cards", "Group bookings", "Late appointments"],
    intro: (name, city) => [
      `${name} is a lash and brow studio in ${city}. The focus is on natural-looking definition that grows out cleanly.`,
      `Sets are built to suit your eye shape and routine, with an honest word on what will and won't work for you.`,
    ],
    praise: [
      "Natural but noticeable. I did not have to think about my eyes for weeks.",
      "Gentle and very careful. The room is so peaceful.",
      "My brows have never looked this good.",
      "Lasted the full four weeks with barely any fallout.",
    ],
  },
  beauty: {
    categories: ["Featured", "Makeup", "Skin prep", "Add-ons"],
    services: [
      svc("Featured", "Makeup Application", [60], 95, "A full look for an event, matched to your skin and outfit."),
      svc("Featured", "Glow Prep + Makeup", [90], 145, "A facial-style prep followed by a soft, luminous makeup look."),
      svc("Makeup", "Bridal Trial", [90], 130, "A complete practice run before the day."),
      svc("Makeup", "Lesson: Everyday Makeup", [60], 110, "Learn a simple routine using products you own."),
      svc("Skin prep", "Express Glow Facial", [30], 60, "Cleanse, mask and massage for skin that photographs well."),
      svc("Add-ons", "Lash Strips Applied", [10], 15, "Strip lashes fitted to your eye shape."),
    ],
    features: [
      { label: "Working artists", detail: "Editorial and event" },
      { label: "Skin-first", detail: "Prep before makeup" },
      { label: "Natural light", detail: "Bright, north-facing room" },
      { label: "Group bookings", detail: "Bridal parties welcome" },
    ],
    greatFor: ["Events", "Weddings", "Photos", "Learning"],
    included: ["Skin consultation", "Setting mist", "Touch-up kit", "Refreshments"],
    addOns: [
      { name: "Lash strips", price: 15 },
      { name: "Touch-up kit", price: 20 },
      { name: "Second look", price: 45 },
    ],
    amenities: ["Natural light", "Consultation", "Group bookings", "On-site service available", "Street parking", "Gift cards", "Trial sessions", "Refreshments"],
    intro: (name, city) => [
      `${name} is a makeup and skin-prep studio in ${city}. Looks start with skin, then build to something that feels like you on a good day.`,
      `Book a single look, a bridal trial or a lesson to learn your own routine.`,
    ],
    praise: [
      "Loved the look and it lasted all night. Felt like myself, just brighter.",
      "The prep made such a difference to how the makeup sat.",
      "Relaxed, funny and very skilled.",
      "Booked a trial for my wedding and I am so glad I did.",
    ],
  },
  float: {
    categories: ["Featured", "Float", "Combination", "Add-ons"],
    services: [
      svc("Featured", "60-Minute Float", [60], 75, "A private pod of warm, salted water, with light and sound off."),
      svc("Featured", "90-Minute Float", [90], 105, "More time to let go, especially for a first float."),
      svc("Float", "Float + Sauna", [120], 135, "Sauna before and float after, with tea between."),
      svc("Combination", "Float + Massage", [120], 190, "A 60-minute massage followed by a 60-minute float."),
      svc("Add-ons", "Guided Breathwork", [15], 15, "A short breathing practice before you enter the pod."),
    ],
    features: [
      { label: "Private pods", detail: "Roomy, with a shower" },
      { label: "Epsom salt", detail: "Filtered between guests" },
      { label: "Quiet lounge", detail: "Tea and journaling" },
      { label: "First-time guide", detail: "A short orientation" },
    ],
    greatFor: ["Deep rest", "Mind quiet", "Sleep", "Recovery"],
    included: ["Towels and earplugs", "Shower amenities", "Tea in the lounge", "Orientation for first floats"],
    addOns: [
      { name: "Extra 30 minutes", price: 30 },
      { name: "Robe rental", price: 6 },
      { name: "Herbal tea flight", price: 8 },
    ],
    amenities: ["Private float pods", "Showers", "Quiet lounge", "Filtered water", "Lockers", "Towel service", "Street parking", "Gift cards"],
    intro: (name, city) => [
      `${name} in ${city} offers float therapy in private, spacious pods, warm and soundless, with the lights and music yours to control.`,
      `Most people leave with a quiet mind. Come once to try it, or build a regular habit.`,
    ],
    praise: [
      "Unexpectedly transformative. Slept like a rock afterwards.",
      "The pod was roomy and spotless. I never felt claustrophobic.",
      "The staff talk you through it perfectly for a first float.",
      "A proper reset. I will be back.",
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Seeds                                                                       */
/* -------------------------------------------------------------------------- */

type Seed = {
  name: string;
  location: string;
  modality: string;
  modalities?: string[];
  family: Family;
  rating?: number;
  image?: string;
  tone: string;
  isNew?: boolean;
  isRecommended?: boolean;
};

const SEEDS: Seed[] = [
  { name: "Studio Lumen", location: "Portland, OR", modality: "Massage", modalities: ["Massage", "Skincare", "Sauna"], family: "massage", rating: 4.9, image: IMG.lumen, tone: "linear-gradient(160deg, #cfd9c9, #a9b89f)", isRecommended: true },
  { name: "Willow & Stone", location: "Austin, TX", modality: "Massage", family: "massage", rating: 4.8, image: IMG.willow, tone: "linear-gradient(160deg, #c3d0c0, #93a68d)" },
  { name: "The Quiet Room", location: "Seattle, WA", modality: "Skincare", modalities: ["Skincare", "Massage"], family: "skin", rating: 4.7, image: IMG.quiet, tone: "linear-gradient(160deg, #d6ddd0, #b1c2a8)" },
  { name: "Sable Recovery Lab", location: "Denver, CO", modality: "Recovery", modalities: ["Cold Plunge", "Sauna"], family: "cold", rating: 4.8, image: IMG.sable, tone: "linear-gradient(160deg, #e0cdb4, #c9a97e)" },
  { name: "Basalt & Bloom", location: "Boulder, CO", modality: "Sauna", modalities: ["Sauna", "Cold Plunge", "Massage"], family: "heat", rating: 4.6, image: IMG.basalt, tone: "linear-gradient(160deg, #dcc7a8, #bfa176)" },
  { name: "North Fork Sauna Co.", location: "Bend, OR", modality: "Sauna", modalities: ["Sauna", "Cold Plunge"], family: "heat", rating: 4.9, image: IMG.northFork, tone: "linear-gradient(160deg, #e4d2b8, #ceab7f)", isRecommended: true },
  { name: "Daniel K. Sauna Studio", location: "Brooklyn, NY", modality: "Sauna", family: "heat", rating: 4.9, image: IMG.daniel, tone: "linear-gradient(160deg, #b9ccd3, #8ea9b3)", isRecommended: true },
  { name: "Reset Cryo + Cold Plunge", location: "Brooklyn, NY", modality: "Cold Plunge", family: "cold", rating: 4.7, tone: "linear-gradient(160deg, #c3d0d6, #9bb4bf)" },
  { name: "Gloss Hair Studio", location: "Austin, TX", modality: "Hair", family: "hair", rating: 4.8, image: IMG.hair, tone: "linear-gradient(160deg, #e8ddd0, #c9b49a)" },
  { name: "Lash & Brow Atelier", location: "Brooklyn, NY", modality: "Lashes & Brows", family: "lash", rating: 4.9, image: IMG.lash, tone: "linear-gradient(160deg, #e6d4cd, #c9a89c)" },
  { name: "The Beauty Bar", location: "Denver, CO", modality: "Makeup", family: "beauty", rating: 4.7, image: IMG.beauty, tone: "linear-gradient(160deg, #ded3c8, #b7a290)" },
  { name: "Priya R. Movement Studio", location: "Austin, TX", modality: "Yoga", modalities: ["Yoga", "Pilates", "Breathwork"], family: "movement", rating: 5.0, image: IMG.priya, tone: "linear-gradient(160deg, #d6cfc3, #b8a98f)", isRecommended: true },
  { name: "Quiet Practice Yoga", location: "Kathmandu, Nepal", modality: "Yoga", family: "movement", rating: 4.8, image: IMG.yoga, tone: "linear-gradient(160deg, #dcd4c6, #c0ac8d)" },
  { name: "Breathline Breathwork", location: "San Diego, CA", modality: "Breathwork", family: "movement", rating: 4.8, image: IMG.breath, tone: "linear-gradient(160deg, #e0d8c9, #c6b291)" },
  { name: "Solace Float Studio", location: "Seattle, WA", modality: "Float Therapy", family: "float", tone: "linear-gradient(160deg, #cdd6d8, #98aeb3)", isNew: true },
  { name: "Marrow & Salt", location: "Denver, CO", modality: "Massage", family: "massage", tone: "linear-gradient(160deg, #ddd0c4, #b89b7c)", isNew: true },
  { name: "Hush Skin Clinic", location: "Brooklyn, NY", modality: "Skincare", family: "skin", tone: "linear-gradient(160deg, #e2d6d0, #c4a397)", isNew: true },
  { name: "Terra Firma Pilates", location: "Austin, TX", modality: "Pilates", family: "movement", tone: "linear-gradient(160deg, #d4d8c6, #a9b48c)", isNew: true },
  { name: "Even Keel Bodywork", location: "Portland, OR", modality: "Massage", family: "massage", tone: "linear-gradient(160deg, #cfd3c8, #a3ad96)", isNew: true },
  { name: "Cinder Sauna House", location: "Santa Fe, NM", modality: "Sauna", family: "heat", tone: "linear-gradient(160deg, #e6d6bd, #c9a877)", isNew: true },
];

/* -------------------------------------------------------------------------- */
/* Builder                                                                     */
/* -------------------------------------------------------------------------- */

/** Stable pseudo-random integer from a string, so placeholder numbers don't change per render. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const REVIEWERS = ["Avery M.", "Jordan T.", "Sam R.", "Priya N.", "Elena V.", "Marcus L.", "Hannah K.", "Diego S.", "Nora B.", "Theo W."];
const WHEN = ["2 weeks ago", "1 month ago", "3 weeks ago", "2 months ago", "5 days ago", "6 weeks ago"];
const TOPIC_SETS: ReviewTopic[][] = [
  ["Service", "Ambience"],
  ["Service", "Cleanliness"],
  ["Ambience", "Value"],
  ["Service", "Value"],
];

// City centres [lat, lng]. Placeholder studios are scattered within ~3 km of these; real studios
// get geocoded from their address when they onboard.
const CITY_CENTERS: Record<string, [number, number]> = {
  Portland: [45.5152, -122.6784],
  Austin: [30.2672, -97.7431],
  Seattle: [47.6062, -122.3321],
  Denver: [39.7392, -104.9903],
  Boulder: [40.015, -105.2705],
  Bend: [44.0582, -121.3153],
  Brooklyn: [40.6782, -73.9442],
  "Santa Fe": [35.687, -105.9378],
  "San Diego": [32.7157, -117.1611],
  Kathmandu: [27.7172, 85.324],
};

// Studios whose details differ from the US-style defaults built below. Merged over the generated provider.
const LOCAL_OVERRIDES: Record<string, Partial<Provider>> = {
  "quiet-practice-yoga": {
    address: "Thamel Marg, Thamel, Kathmandu 44600, Nepal",
    hours: [
      { day: "Sunday – Friday", open: "6:00 am – 8:00 pm" },
      { day: "Saturday", open: "7:00 am – 12:00 pm" },
    ],
    nearby: [
      { label: "Café", time: "2 min walk" },
      { label: "Bus stop", time: "5 min walk" },
      { label: "Garden of Dreams", time: "8 min walk" },
      { label: "Parking", time: "Street, nearby" },
    ],
  },
};

const STREETS = ["Alder Street", "Pine Avenue", "Mercer Lane", "Larkin Street", "Harbor Road", "Cedar Court"];

/** Deterministic offset from the city centre, so reseeding never moves a pin. */
function position(city: string, h: number): { lat?: number; lng?: number } {
  const c = CITY_CENTERS[city];
  if (!c) return {};
  const dLat = (((h >>> 3) % 1000) / 1000 - 0.5) * 0.06;
  const dLng = (((h >>> 13) % 1000) / 1000 - 0.5) * 0.06;
  return { lat: +(c[0] + dLat).toFixed(5), lng: +(c[1] + dLng).toFixed(5) };
}

function buildProvider(seed: Seed): Provider {
  const tpl = TEMPLATES[seed.family];
  const slug = slugify(seed.name);
  const h = hash(slug);
  const [city, region] = seed.location.split(",").map((s) => s.trim());
  const rating = seed.rating ?? 4.6 + (h % 4) / 10;
  const reviewCount = seed.isNew ? 3 + (h % 9) : 64 + (h % 260);

  const services: Service[] = tpl.services.map((s, i) => ({ ...s, id: `${slug}-${i}` }));

  const ownImage = seed.image ?? FAMILY_IMAGES[seed.family][h % FAMILY_IMAGES[seed.family].length];
  const gallery = Array.from(
    new Set([ownImage, ...FAMILY_IMAGES[seed.family], ...Object.values(IMG).slice(h % 4)])
  ).slice(0, 6);

  const reviews: Review[] = tpl.praise.map((text, i) => ({
    author: REVIEWERS[(h + i * 3) % REVIEWERS.length],
    when: WHEN[(h + i) % WHEN.length],
    rating: i === 3 && !seed.isNew ? 4 : 5,
    visit: services[(h + i) % services.length].name,
    text,
    topics: TOPIC_SETS[(h + i) % TOPIC_SETS.length],
  }));

  return {
    slug,
    name: seed.name,
    city,
    region,
    location: seed.location,
    modality: seed.modality,
    modalities: seed.modalities ?? [seed.modality],
    rating,
    reviewCount,
    isNew: Boolean(seed.isNew),
    isRecommended: Boolean(seed.isRecommended),
    tone: seed.tone,
    image: ownImage,
    gallery,
    // Placeholder: one shared loop stands in until studios supply their own walkthrough.
    tour: { video: "/videos/hero-loop.mp4", poster: ownImage, duration: "0:12" },
    intro: tpl.intro(seed.name, city),
    greatFor: tpl.greatFor,
    features: tpl.features,
    serviceCategories: tpl.categories,
    services,
    included: tpl.included,
    addOns: tpl.addOns,
    amenities: tpl.amenities,
    address: `${100 + (h % 800)} ${STREETS[h % STREETS.length]}, ${city}, ${region}`,
    hours: [
      { day: "Monday – Friday", open: "9:00 am – 8:00 pm" },
      { day: "Saturday", open: "9:00 am – 6:00 pm" },
      { day: "Sunday", open: "10:00 am – 5:00 pm" },
    ],
    nearby: [
      { label: "Café", time: "2 min walk" },
      { label: "Bus and transit stop", time: "4 min walk" },
      { label: "Parking", time: "On site" },
      { label: "Park", time: "6 min walk" },
    ],
    reviewSummary: seed.isNew
      ? "Recently opened. Early guests mention a calm room, careful staff and easy booking."
      : "Guests describe an unhurried, spotless space, staff who listen first, and a visit that leaves them noticeably more at ease.",
    reviews,
    fromPrice: Math.min(...services.filter((s) => s.category !== "Add-ons").map((s) => s.price)),
    ...position(city, h),
    ...LOCAL_OVERRIDES[slug],
  };
}

export const seedProviders: Provider[] = SEEDS.map(buildProvider);
