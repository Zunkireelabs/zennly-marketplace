/**
 * Curated editorial collections (docs/PRODUCT_CONTEXT.md §3, §7.3): a titled, ordered list of
 * provider slugs plus editorial copy, not a new entity. This file is the source for
 * `prisma/seed.ts` and the fallback when DATABASE_URL isn't set; the app reads the
 * `collections` and `collection_providers` tables.
 *
 * `providers` order is the "Most loved" fallback order on the collection page.
 */

export type CollectionSeed = {
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  tone: string;
  image: string;
  imageAlt: string;
  providers: string[];
};

export const collectionSeeds: CollectionSeed[] = [
  {
    slug: "restore-and-retreat",
    label: "Restore & Retreat",
    title: "Restore & Retreat.",
    description: "Slow mornings, hot stone, and studios built for doing absolutely nothing.",
    intro:
      "Studios chosen for how they make an hour feel longer: low light, warm stone, heat you can sink into and staff who never rush you out.",
    tone: "linear-gradient(160deg, #dccbb0, #b89a72)",
    image:
      "https://images.pexels.com/photos/6560308/pexels-photo-6560308.jpeg?auto=compress&cs=tinysrgb&w=1600",
    imageAlt: "A tranquil massage room with natural light and neatly arranged furnishings",
    providers: [
      "studio-lumen",
      "willow-and-stone",
      "north-fork-sauna-co",
      "the-quiet-room",
      "basalt-and-bloom",
      "quiet-practice-yoga",
      "marrow-and-salt",
      "cinder-sauna-house",
    ],
  },
  {
    slug: "pre-event-glow",
    label: "Pre-Event Glow",
    title: "Pre-Event Glow.",
    description: "Facials, lashes, and skin prep for the week before the big day.",
    intro:
      "Skin, lashes and hair, booked in the right order. Start a week out for facials, finish the day before with lashes and a blow-dry.",
    tone: "linear-gradient(160deg, #e0cdc7, #c79a90)",
    image:
      "https://images.pexels.com/photos/32078961/pexels-photo-32078961.jpeg?auto=compress&cs=tinysrgb&w=1600",
    imageAlt: "A relaxing spa facial treatment with a light therapy device for skincare",
    providers: [
      "the-beauty-bar",
      "lash-and-brow-atelier",
      "gloss-hair-studio",
      "hush-skin-clinic",
      "the-quiet-room",
      "studio-lumen",
    ],
  },
  {
    slug: "new-in-portland",
    label: "New in Portland",
    title: "New in Portland.",
    description: "The newest studios and practitioners to join in your city.",
    intro:
      "The newest studios to join Zennly, starting with Portland's Even Keel Bodywork. Early guests get the quietest appointments, and every studio here opened within the last month.",
    tone: "linear-gradient(160deg, #cdd6cb, #a3b89f)",
    image:
      "https://images.pexels.com/photos/38661701/pexels-photo-38661701.jpeg?auto=compress&cs=tinysrgb&w=1600",
    imageAlt: "Portland's skyline with the Hawthorne Bridge and Willamette River",
    providers: [
      "even-keel-bodywork",
      "solace-float-studio",
      "marrow-and-salt",
      "hush-skin-clinic",
      "terra-firma-pilates",
      "cinder-sauna-house",
    ],
  },
  {
    slug: "quiet-sundays",
    label: "Quiet Sundays",
    title: "Quiet Sundays.",
    description: "A slow, unhurried hour to close out the week — no plans, just rest.",
    intro:
      "No plans, no phone. Slow movement, a float, a long massage: places that suit the last unhurried hour of the week.",
    tone: "linear-gradient(160deg, #d3cdc0, #ab9d84)",
    image:
      "https://images.pexels.com/photos/7532108/pexels-photo-7532108.jpeg?auto=compress&cs=tinysrgb&w=1600",
    imageAlt: "A cup of coffee on a white duvet, evoking cozy Sunday mornings",
    providers: [
      "the-quiet-room",
      "willow-and-stone",
      "quiet-practice-yoga",
      "solace-float-studio",
      "breathline-breathwork",
      "priya-r-movement-studio",
      "terra-firma-pilates",
    ],
  },
  {
    slug: "recovery-rituals",
    label: "Recovery Rituals",
    title: "Recovery Rituals.",
    description: "Cold plunge, sauna, and breathwork for the days after a hard effort.",
    intro:
      "Heat, cold and breath, in the order that works. For the days after a hard race, a long flight or a week that took more than it gave.",
    tone: "linear-gradient(160deg, #c7d2d6, #92aab5)",
    image:
      "https://images.pexels.com/photos/31092914/pexels-photo-31092914.jpeg?auto=compress&cs=tinysrgb&w=1600",
    imageAlt: "Water poured over sauna stones, creating steam in a serene sauna",
    providers: [
      "sable-recovery-lab",
      "north-fork-sauna-co",
      "daniel-k-sauna-studio",
      "reset-cryo-and-cold-plunge",
      "basalt-and-bloom",
      "breathline-breathwork",
      "solace-float-studio",
      "cinder-sauna-house",
    ],
  },
];
