import { businessesHref } from "@/lib/marketing/links";
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_PRODUCT_COLUMNS,
  FOOTER_SMALL_COLUMNS,
  type FooterColumn,
} from "@/lib/marketing/footer-data";

const trialAttr = { "data-trial-open": "" };

function Column({ column }: { column: FooterColumn }) {
  return (
    <div className="v2-footer-col">
      <h2 className="v2-footer-heading">{column.heading}</h2>
      {column.links.map((link) => (
        <a key={link.label} href={businessesHref(link.href)} className="v2-footer-link" {...(link.trial ? trialAttr : {})}>
          {link.label}
        </a>
      ))}
    </div>
  );
}

/** The shared footer (was _footer-v2.njk). Markup and class names are unchanged from the mirror. */
export function SiteFooter() {
  return (
    <footer className="v2-site-footer">
      <div className="v2-wrap">
        <div className="v2-footer-top">
          {/* Plain <a>: "/" is the marketplace, a different root layout, so this is meant to be a full page load. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="v2-footer-logo" aria-label="Zennly home">
            {/* Plain <img>: the stylesheet and URLs are the mirror's, nothing to optimise through next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={businessesHref("/assets/images/logo.png")} alt="Zennly" className="v2-footer-logo-img" />
          </a>
          <div className="v2-footer-ctas">
            <button type="button" className="v2-footer-btn v2-footer-btn--primary" {...trialAttr}>
              Try a free demo
            </button>
            <a href={businessesHref("/contact/")} className="v2-footer-btn v2-footer-btn--ghost">
              Talk to us
            </a>
          </div>
        </div>

        <nav className="v2-footer-grid v2-footer-grid--product" aria-label="Product">
          {FOOTER_PRODUCT_COLUMNS.map((column) => (
            <Column key={column.heading} column={column} />
          ))}
        </nav>

        <nav className="v2-footer-grid v2-footer-grid--small" aria-label="Company and resources">
          {FOOTER_SMALL_COLUMNS.map((column) => (
            <Column key={column.heading} column={column} />
          ))}
          <div className="v2-footer-col v2-footer-col--about">
            <p className="v2-footer-tagline">
              Online booking, operations and financial control for appointment-based businesses. Built in Nepal.
            </p>
            <div className="v2-footer-status">
              <span className="v2-live-dot"></span>
              <span>All systems operational</span>
            </div>
          </div>
        </nav>

        <div className="v2-footer-bottom">
          <span className="v2-footer-copyright">
            © 2026 Zennly by{" "}
            <a href="https://zunkireelabs.com" target="_blank" rel="noopener">
              Zunkiree Labs
            </a>
            . All rights reserved.
          </span>
          <nav className="v2-footer-legal" aria-label="Legal">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <a key={link.label} href={businessesHref(link.href)}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
