import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zennly.io";

// web-zenly's old robots.txt listed ~15 user agents individually (GPTBot, ClaudeBot,
// PerplexityBot, ...) but every single rule was identical: Allow: /. That's a single wildcard
// policy wearing an itemized list; collapsing it to one `userAgent: "*"` rule is the same
// effective policy with no per-bot behavior lost. If a bot-specific rule is ever needed (e.g.
// blocking one crawler while allowing the rest), add it as its own `rules` entry here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
