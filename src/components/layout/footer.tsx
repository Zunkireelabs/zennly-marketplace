import Image from "next/image";
import Link from "next/link";
import { MARKETING_ABOUT, MARKETING_SITE_HOME } from "@/lib/marketing-links";

// Discover links are placeholders for future /search?modality= filters, unrelated to the
// marketing site — left as "#" (out of this sweep's scope: it's an internal-routing gap, not
// a stale marketing link). "Careers" has no destination yet; also left as "#".
const FOOTER_COLUMNS = [
  {
    title: "Discover",
    links: [
      { label: "Massage", href: "#" },
      { label: "Facials", href: "#" },
      { label: "Yoga & Movement", href: "#" },
      { label: "Recovery", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: MARKETING_ABOUT },
      { label: "For Businesses", href: MARKETING_SITE_HOME },
      { label: "Careers", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    // Scoped tint (not bg-muted directly) so lightening the footer doesn't also lighten
    // the toggle pill/chip borders/card backgrounds that share the --muted token elsewhere.
    <footer className="border-t border-border bg-[#f5f1e9]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-2">
            <Link href="/" aria-label="Zennly home" className="inline-block">
              <Image
                src="/images/brand/zennly-logo.png"
                alt="Zennly"
                width={467}
                height={157}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              A calmer way to discover and book wellness &amp; self-care near you.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {column.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Zennly.
        </p>
      </div>
    </footer>
  );
}
