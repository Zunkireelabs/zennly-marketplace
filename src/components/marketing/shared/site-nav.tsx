import { businessesHref } from "@/lib/marketing/links";
import { NAV_ICONS, NAV_MENU, type NavGroup, type NavItem, type NavKey, type NavLink } from "@/lib/marketing/nav-menu";

const KEYS: NavKey[] = ["capabilities", "types", "resources"];
const trialAttr = { "data-trial-open": "" };

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d={NAV_ICONS[name]} />
    </svg>
  );
}

function Chevron({ className }: { className: string }) {
  return (
    <svg className={className} width="10" height="6" viewBox="0 0 10 6" fill="none">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuLink({ item }: { item: NavItem }) {
  return (
    <a href={businessesHref(item.href)} className="v2-mm__link">
      <Icon name={item.icon} />
      <span>{item.label}</span>
      {item.tag ? <span className="v2-mm__tag">{item.tag}</span> : null}
    </a>
  );
}

function MenuLinks({ items, className }: { items: NavItem[]; className: string }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <MenuLink key={item.href} item={item} />
      ))}
    </div>
  );
}

function MenuGroups({ groups }: { groups: NavGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="v2-mm__group">
          <div className="v2-mm__label">{group.label}</div>
          <MenuLinks items={group.items} className="v2-mm__links" />
        </div>
      ))}
    </>
  );
}

function MenuFoot({ links, className }: { links: NavLink[]; className: string }) {
  return (
    <>
      {links.map((link) => (
        <a key={link.href} href={businessesHref(link.href)} className={className}>
          {link.label} <Icon name="arrow-right" size={14} />
        </a>
      ))}
    </>
  );
}

/** The shared header: top bar, desktop mega menus, mobile accordion and scrim (was _nav-v2.njk + navMenu.js). */
export function SiteNav() {
  const nm = NAV_MENU;
  return (
    <>
      <header className="v2-nav" id="v2Nav" aria-label="Primary navigation">
        <div className="v2-nav-inner">
          <div className="v2-nav-content">
            <div className="v2-nav-col v2-nav-col--start">
              {/* Plain <a>: "/" is the marketplace, a different root layout, so this is meant to be a full page load. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="v2-nav__logo">
                {/* Plain <img>: the stylesheet and URLs are the mirror's, nothing to optimise through next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={businessesHref("/assets/images/logo.png")} alt="Zennly" className="v2-nav__logo-img" />
              </a>
            </div>
            <nav className="v2-nav-col v2-nav-col--center v2-nav__links" aria-label="Main menu">
              {KEYS.map((key) => (
                <div key={key} className="v2-nav__item--has-mega" data-mega={key}>
                  <a
                    href={businessesHref(nm[key].href)}
                    className="v2-nav__mega-trigger"
                    aria-expanded="false"
                    aria-controls={`v2Mega-${key}`}
                  >
                    {nm[key].label}
                    <Chevron className="v2-nav__chevron" />
                  </a>
                </div>
              ))}
            </nav>
            <div className="v2-nav-col v2-nav-col--end">
              <button
                type="button"
                id="v2-nav-toggle"
                className="v2-nav__toggle"
                aria-label="Toggle menu"
                aria-expanded="false"
                aria-controls="v2-nav-mobile"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
              <a href="https://app.zennly.io/login" className="v2-btn v2-btn--ghost">
                Login
              </a>
              <a href="#try-free" className="v2-btn" {...trialAttr}>
                Try a free demo
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Mega menu panels sit beside the nav, not inside .v2-nav-inner: that element gets a backdrop-filter
          once scrolled, which would make it the containing block for these fixed panels and clip them to the
          76px bar. Positioned via JS-toggled .is-open. */}
      <div className="v2-nav-mega v2-mm v2-mm--capabilities" id="v2Mega-capabilities" role="region" aria-label="Capabilities menu">
        <div className="v2-mm__body">
          <div className="v2-mm__groups v2-mm__groups--4">
            <MenuGroups groups={nm.capabilities.groups ?? []} />
          </div>
          <a
            href={businessesHref("/case-study/")}
            className="v2-mm__story"
            style={{ backgroundImage: `url('${businessesHref("/assets/images/nuad/massage-room.jpg")}')` }}
          >
            <span className="v2-mm__story-eyebrow">Case study</span>
            <span className="v2-mm__story-title">How Nuad Thai Spa runs four branches on Zennly</span>
            <span className="v2-mm__story-cta">
              Read the story <Icon name="arrow-right" size={14} />
            </span>
          </a>
        </div>
        <div className="v2-mm__foot">
          <MenuFoot links={nm.capabilities.footer ?? []} className="v2-mm__foot-link" />
        </div>
      </div>

      <div className="v2-nav-mega v2-mm v2-mm--types" id="v2Mega-types" role="region" aria-label="Types menu">
        <div className="v2-mm__body">
          <MenuLinks items={nm.types.items ?? []} className="v2-mm__links v2-mm__links--2col" />
          <div className="v2-mm__aside">
            <h4 className="v2-mm__aside-title">Don&rsquo;t see your business?</h4>
            <p className="v2-mm__aside-text">If you take appointments, Zennly fits &ndash; set up your way.</p>
            <a href={businessesHref("/contact/")} className="v2-mm__aside-link">
              Talk to us <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>
        <div className="v2-mm__foot">
          <MenuFoot links={nm.types.footer ?? []} className="v2-mm__foot-link" />
        </div>
      </div>

      <div
        className="v2-nav-mega v2-nav-mega--sm v2-mm v2-mm--resources"
        id="v2Mega-resources"
        role="region"
        aria-label="Resources menu"
      >
        <div className="v2-mm__body">
          <div className="v2-mm__groups v2-mm__groups--2">
            <MenuGroups groups={nm.resources.groups ?? []} />
          </div>
        </div>
      </div>

      {/* Blur backdrop for the active mega menu */}
      <div className="v2-nav-backdrop" aria-hidden="true"></div>

      {/* Mobile menu: the tap equivalent of the desktop mega menu, same content and icons. */}
      <nav id="v2-nav-mobile" className="v2-nav-mobile" aria-hidden="true" data-lenis-prevent="">
        {KEYS.map((key) => (
          <div key={key} className="v2-nav-mobile__group">
            <button
              type="button"
              className="v2-nav-mobile__trigger"
              aria-expanded="false"
              aria-controls={`v2-nav-mobile-${key}`}
            >
              {nm[key].label}
              <Chevron className="v2-nav-mobile__chevron" />
            </button>
            <div className="v2-nav-mobile__submenu v2-mm" id={`v2-nav-mobile-${key}`}>
              {nm[key].groups ? (
                <MenuGroups groups={nm[key].groups} />
              ) : (
                <MenuLinks items={nm[key].items ?? []} className="v2-mm__links" />
              )}
              {nm[key].footer ? <MenuFoot links={nm[key].footer} className="v2-mm__more" /> : null}
            </div>
          </div>
        ))}
        <a href="https://app.zennly.io/login" className="v2-btn v2-btn--ghost">
          Login
        </a>
        <a href="#try-free" className="v2-btn" {...trialAttr}>
          Try a free demo
        </a>
      </nav>

      {/* Solid scrim behind the mobile menu (tap-outside-to-close target). Mobile-only. */}
      <div id="v2-nav-mobile-scrim" className="v2-nav-mobile-scrim" aria-hidden="true"></div>
    </>
  );
}
