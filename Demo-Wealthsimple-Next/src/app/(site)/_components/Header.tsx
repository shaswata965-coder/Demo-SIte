import type { Product, Site } from '@/payload-types'

import { Mark } from './Mark'

const SECTIONS = [
  { href: '#about', label: 'Why Larch' },
  { href: '#research', label: 'Research' },
  { href: '#contact', label: 'Contact' },
]

/* The strip linking the repo's other demos, pinned above the header until
   a visitor closes it (remembered; _lib/site.js). */
export function DemoBanner({ links }: { links: NonNullable<Site['demoLinks']> }) {
  if (!links.length) return null
  return (
    <aside className="demo-banner" id="demoBanner" aria-label="Other demos">
      <div className="demo-banner-in">
        <span className="demo-banner-label">More demos</span>
        {links.map((l) => (
          <a href={l.href} key={l.id ?? l.href}>
            {l.label}
            {l.reference ? <span className="demo-banner-ref">· {l.reference}</span> : null}
          </a>
        ))}
        <button className="demo-banner-x" id="demoBannerClose" type="button" aria-label="Hide the demos banner">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

export function Header({ products, site }: { products: Product[]; site: Site }) {
  return (
    <div className="hdr-wrap" id="hdr">
      <header className="hdr">
        <div className="hdr-left">
          <a className="brand" href="#top" aria-label="Larch, back to top">
            <Mark />
            <span className="wordmark">larch</span>
          </a>
          <a className="btn btn-solid btn-sm hdr-cta-m" href="#contact">
            {site.headerCta}
          </a>
        </div>

        <nav className="hdr-nav" aria-label="Main">
          <button className="nav-btn" type="button" popoverTarget="pop-products">
            Products
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 4.5 6 7.5 9 4.5" />
            </svg>
          </button>
          <div className="pop" id="pop-products" popover="auto">
            <ul className="pop-list" role="list">
              {products.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.slug}`}>
                    <b>{p.title}</b>
                    <span>{p.navBlurb}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {SECTIONS.map((s) => (
            <a className="nav-link" href={s.href} key={s.href}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="hdr-right">
          <button className="icon-btn" id="themeBtn" type="button" aria-label="Dark theme" aria-pressed="false">
            <svg className="i-moon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />
            </svg>
            <svg className="i-sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
            </svg>
          </button>
          <a className="nav-link hdr-signin" href="#contact">
            Sign in
          </a>
          <a className="btn btn-solid btn-sm hdr-cta" href="#contact">
            {site.headerCta}
          </a>
          <button className="icon-btn hdr-menu" type="button" popoverTarget="drawer" aria-label="Menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="drawer" id="drawer" popover="auto">
        <nav aria-label="Menu">
          <p className="drawer-h">Products</p>
          <ul role="list">
            {products.map((p) => (
              <li key={p.id}>
                <a href={`#${p.slug}`}>{p.title}</a>
              </li>
            ))}
          </ul>
          <p className="drawer-h">Larch</p>
          <ul role="list">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <a href={s.href}>{s.label}</a>
              </li>
            ))}
          </ul>
          <a className="btn btn-solid" href="#contact">
            {site.menuCta}
          </a>
        </nav>
      </div>
    </div>
  )
}
