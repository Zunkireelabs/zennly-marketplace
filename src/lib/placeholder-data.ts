/**
 * Realistic-looking placeholder data for the showcase-first homepage.
 * Shaped plausibly against the eventual Provider/Service model (see docs/PRODUCT_CONTEXT.md §4)
 * so wiring in real data later isn't a rebuild — this is not live data.
 */

export const heroFeature = {
  practitionerName: "Maya Chen",
  studioName: "Studio Lumen",
  location: "Portland, OR",
  tagline: "A quiet hour, just for you",
  serviceLabel: "Deep tissue massage",
};

/**
 * Promotional banners — image-led offer banners for provider offers, per
 * docs/PRODUCT_CONTEXT.md §7.9 (decision reversed 2026-09-26; originally excluded, now
 * intentionally added). Structure adapted from StayVista's brand-collab banner strip
 * (docs/research/refs/stayvista.md ~line 324), own copy/imagery only — no coupon codes or
 * pricing claims, since payment/discount mechanics are still undecided (§6).
 */
export const promoBanners: {
  badge: string;
  headline: string;
  /** Optional: a banner with no honest, settled claim to make should omit this rather than invent one. */
  subcopy?: string;
  ctaLabel: string;
  tone: string;
  image: string;
  alt: string;
}[] = [
  {
    badge: "New here",
    headline: "First Visit, On Us",
    ctaLabel: "Claim offer",
    tone: "linear-gradient(135deg, #d8c9b3, #a9875f)",
    image: "/images/promo/first-visit-banner.jpg",
    alt: "A relaxing spa scene with candles, soft towels, and fresh flowers",
  },
  {
    badge: "Referral",
    headline: "Refer a Friend",
    subcopy: "Give $15, get $15 — for every friend who books their first session.",
    ctaLabel: "Get your link",
    tone: "linear-gradient(135deg, #c4d0d4, #7f97a1)",
    image:
      "https://images.pexels.com/photos/6299359/pexels-photo-6299359.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Two friends laughing together outside on a sunny day",
  },
];

/** Compressed value pillars — no paragraphs, per docs/PRODUCT_CONTEXT.md §7.4. */
/**
 * `word`/`subword` split the title into the two-tier display treatment adapted from Le
 * Collectionist's value-prop band (big serif word + small tracked subword, e.g. their
 * "UNIQUE / HOMES") — structure only, own copy (see DESIGN_ORCHESTRATOR.md reference principle).
 */
export const valueProps = [
  {
    word: "Curated",
    subword: "Providers",
    description: "Every studio and practitioner is reviewed before they're listed.",
  },
  {
    word: "Verified",
    subword: "& Trusted",
    description: "Real reviews, real people — no anonymous ratings.",
  },
  {
    word: "Book",
    subword: "in Seconds",
    description: "See availability and confirm without back-and-forth.",
  },
];

/**
 * Provider-acquisition pitch — structurally adapted from Fresha's "Fresha for business"
 * block (headline + subcopy + CTA + trust stat, paired with a product image), own copy.
 * `previewName`/`previewLocation`/`previewRating` intentionally match the Studio Lumen entry
 * used in heroFeature and the homepage rails (lib/home-rails.ts) so the placeholder universe stays coherent.
 */
export const providerPitch = {
  eyebrow: "For Businesses",
  headline: "Zennly for Business",
  subcopy:
    "Reach self-care clients who are already looking for what you offer. List your studio free — no setup fees, no long-term contracts.",
  ctaLabel: "List Your Business",
  statLabel: "Rated 5.0 by early providers",
  previewName: "Studio Lumen",
  previewLocation: "Portland, OR",
  previewRating: 4.9,
};

/** Human social proof — named stories, not star ratings, docs/PRODUCT_CONTEXT.md §7.5. */
/**
 * `video`/`poster`/`videoAlt` back the video-card carousel treatment, structurally adapted
 * from StayVista's "Stay like the stars" video rail (poster + play button, click to play) —
 * own content, sourced the same way as hero.tsx's HERO_VIDEOS. See docs/PRODUCT_CONTEXT.md
 * §7.5 (human stories, not star ratings) and the reference principle in §2.
 */
export const socialProofStories = [
  {
    name: "Priya R.",
    location: "Austin, TX",
    story: "My Sunday reset now starts with an hour at Willow & Stone.",
    tone: "linear-gradient(135deg, #d8c9b3, #b89a76)",
    video: "https://videos.pexels.com/video-files/4809192/4809192-uhd_2560_1440_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/4809192/pexels-photo-4809192.jpeg?auto=compress&w=1260&h=750&dpr=1",
    videoAlt: "Aerial view of a woman relaxing on a sun lounger by the poolside",
  },
  {
    name: "Daniel K.",
    location: "Brooklyn, NY",
    story: "Found a sauna studio two blocks from home I didn't know existed.",
    tone: "linear-gradient(135deg, #c4d0d4, #94aab3)",
    video: "https://videos.pexels.com/video-files/9145754/9145754-uhd_1440_2732_25fps.mp4",
    poster:
      "https://images.pexels.com/videos/9145754/pexels-photo-9145754.jpeg?auto=compress&w=1260&h=750&dpr=1",
    videoAlt: "A soothing scene of a person relaxing in a steam-filled sauna",
  },
  {
    name: "Aisha M.",
    location: "Denver, CO",
    story: "Booked a same-day facial before a friend's wedding — no stress.",
    tone: "linear-gradient(135deg, #e0cac1, #c1958a)",
    video: "https://videos.pexels.com/video-files/31797386/13546185_1080_1920_60fps.mp4",
    poster:
      "https://images.pexels.com/videos/31797386/pexels-photo-31797386.jpeg?auto=compress&w=1260&h=750&dpr=1",
    videoAlt: "Relaxing spa facial treatment at a wellness center",
  },
  {
    name: "Marcus T.",
    location: "Seattle, WA",
    story: "Breathwork before my Monday standups changed everything.",
    tone: "linear-gradient(135deg, #cdd6cb, #9fb39a)",
    video: "https://videos.pexels.com/video-files/6955518/6955518-hd_1080_1920_25fps.mp4",
    poster:
      "https://images.pexels.com/videos/6955518/1-person-adult-african-african-american-girl-6955518.jpeg?auto=compress&w=1260&h=750&dpr=1",
    videoAlt: "A young woman meditating indoors, focused on relaxation and peace",
  },
  {
    name: "Elena V.",
    location: "Boulder, CO",
    story: "Left my massage laughing with the practitioner — best hour of my week.",
    tone: "linear-gradient(135deg, #e0cdc7, #c79a90)",
    video: "https://videos.pexels.com/video-files/34546946/14637786_1440_2564_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/34546946/pexels-photo-34546946.jpeg?auto=compress&w=1260&h=750&dpr=1",
    videoAlt: "A young woman enjoying a peaceful moment in the summer sun outdoors",
  },
];

/**
 * Written, star-rated reviews FROM Zennly providers ABOUT the Zennly booking platform itself —
 * not customers reviewing a treatment (that's socialProofStories above, §7.5's "human stories,
 * not star ratings" decision, a separate section this one sits alongside, not against). These
 * substantiate providerPitch's "Rated 5.0 by early providers" stat line right above this
 * section, and exist for SEO: crawlable text naming a real-sounding studio talking about
 * booking volume, no-shows, and free/no-contract listing is exactly the market-presence
 * content §4 calls for. Each entry reuses a provider already introduced elsewhere
 * (the homepage rails) to keep the placeholder universe coherent, not a disjoint cast.
 * No stock reviewer photos — `initial` backs a plain letter-avatar instead of a fabricated
 * headshot standing in for a real business owner. Angles mixed per user direction 2026-09-28:
 * booking volume, fewer no-shows/scheduling, and no fees/easy setup — one each, plus a
 * combined one, so the section doesn't read one-note.
 */
export const platformReviews = [
  {
    reviewerName: "Maya Chen",
    reviewerRole: "Owner, Studio Lumen",
    reviewerLocation: "Portland, OR",
    initial: "M",
    tone: "linear-gradient(135deg, #cfd9c9, #a9b89f)",
    rating: 5,
    headline: "Brought in clients we'd never have found",
    body: "Most of our new bookings now come through Zennly. We list one calendar and get discovered by people actively looking for a massage nearby — no ad spend.",
    providerName: "Studio Lumen",
  },
  {
    reviewerName: "Owen T.",
    reviewerRole: "Founder, North Fork Sauna Co.",
    reviewerLocation: "Bend, OR",
    initial: "O",
    tone: "linear-gradient(135deg, #e4d2b8, #ceab7f)",
    rating: 5,
    headline: "Cut our no-shows almost in half",
    body: "The automated reminders alone paid for themselves. Clients confirm through the app and we stopped losing slots to people who just forgot.",
    providerName: "North Fork Sauna Co.",
  },
  {
    reviewerName: "Priya R.",
    reviewerRole: "Founder, Priya R. Movement Studio",
    reviewerLocation: "Austin, TX",
    initial: "P",
    tone: "linear-gradient(135deg, #d6cfc3, #b8a98f)",
    rating: 5,
    headline: "Free to list, no contract, no catch",
    body: "I was skeptical of another platform asking for a cut. Zennly's free to list with no long-term contract, so trying it out cost us nothing.",
    providerName: "Priya R. Movement Studio",
  },
  {
    reviewerName: "Dana W.",
    reviewerRole: "Owner, The Quiet Room",
    reviewerLocation: "Seattle, WA",
    initial: "D",
    tone: "linear-gradient(135deg, #d6ddd0, #b1c2a8)",
    rating: 4,
    headline: "Scheduling finally feels manageable",
    body: "Between new client volume and fewer no-shows, our calendar stopped feeling chaotic. Setup took an afternoon, and support actually responds.",
    providerName: "The Quiet Room",
  },
];
