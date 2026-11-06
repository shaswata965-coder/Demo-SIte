import type { Product, Site } from '@/payload-types'

import { Mark } from './Mark'

export function Footer({ products, site, newsletterName }: { products: Product[]; site: Site; newsletterName: string }) {
  return (
    <footer className="foot rm-lichen">
      <div className="wrap">
        <div className="foot-top">
          <a className="brand" href="#top" aria-label="Larch, back to top">
            <Mark />
            <span className="wordmark">larch</span>
          </a>
          <nav className="foot-cols" aria-label="Footer">
            <div>
              <h3>Products</h3>
              <ul role="list">
                {products.map((p) => (
                  <li key={p.id}>
                    <a href={`#${p.slug}`}>{p.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Company</h3>
              <ul role="list">
                <li>
                  <a href="#about">Why Larch</a>
                </li>
                <li>
                  <a href="#research">{newsletterName}</a>
                </li>
                <li>
                  <a href="#contact">Contact</a>
                </li>
              </ul>
            </div>
            <div>
              <h3>Reach us</h3>
              <ul role="list">
                <li>{site.contact.email}</li>
                <li>{site.contact.phone}</li>
                <li>{site.contact.offices}</li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="foot-legal">
          <p>{site.footer.legal}</p>
          <p>{site.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
