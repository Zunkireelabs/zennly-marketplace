import Image from "next/image";
import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Discover",
    links: ["Massage", "Facials", "Yoga & Movement", "Recovery"],
  },
  {
    title: "Company",
    links: ["About", "For Providers", "Careers"],
  },
];

export function Footer({ providersHref = "#" }: { providersHref?: string }) {
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
                  <li key={link}>
                    <Link
                      href={link === "For Providers" ? providersHref : "#"}
                      className="text-sm text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
                    >
                      {link}
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
