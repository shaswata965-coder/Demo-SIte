import type { Product } from '@/payload-types'

import { PICTURES } from '../_pictures'
import { v } from '../_lib/v'
import { Mark } from './Mark'
import { MotionButton } from './MotionButton'
import { SplitWords } from './SplitWords'

/* The exploded menu: every product's name in very large serif. On hover a
   row turns white and its icon and description slide in. */
export function ProductMenu({ products }: { products: Product[] }) {
  return (
    <section className="menu rm-lichen" id="products" aria-labelledby="menu-h">
      <h2 className="sr-only" id="menu-h">
        Products
      </h2>
      <nav className="wrap" aria-label="Explore our products">
        <ul className="menu-list" role="list">
          {products.map((p, i) => {
            const { Icon } = PICTURES[p.picture]
            return (
              <li data-reveal="" style={v({ '--i': i })} key={p.id}>
                <a className="menu-link" href={`#${p.slug}`} aria-describedby={`md-${p.slug}`}>
                  <span className="menu-item">
                    <span className="menu-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="menu-label">
                      <span className="ml-in">{p.name}</span>
                    </span>
                    <span className="menu-desc" id={`md-${p.slug}`}>
                      {p.menuDescription}
                    </span>
                    <span className="menu-arrow" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M5 12h13M13 7l5 5-5 5" />
                      </svg>
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </section>
  )
}

/* A full-bleed product hero: its looping picture behind, copy over it. */
export function ProductSection({ product: p }: { product: Product }) {
  const { Picture } = PICTURES[p.picture]
  const gradient = p.room === 'dawn' ? ' ph-gradient' : ''
  return (
    <section className={`ph rm-${p.room}${gradient}`} id={p.slug} aria-labelledby={`${p.slug}-h`}>
      <div className="ph-media">
        <div className="stage">
          <Picture />
        </div>
        <div className="ph-overlay" aria-hidden="true"></div>
      </div>
      <div className="ph-inner wrap">
        <div className="ph-copy">
          <p className="eyebrow-wm" data-at-fade="">
            <Mark />
            <span className="wordmark">larch</span> {p.name}
          </p>
          <h2 id={`${p.slug}-h`} className="t-h2" data-at="">
            <SplitWords text={p.headline} />
          </h2>
          <div className="ctas" data-at-fade="">
            {(p.ctas ?? []).map((c) => (
              <a className={`btn btn-${c.style}`} href={c.href} key={c.id ?? c.label}>
                {c.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <MotionButton />
    </section>
  )
}
