import type { Home } from '@/payload-types'

import { LeadForm } from './LeadForm'
import { MotionButton } from './MotionButton'
import { SplitWords } from './SplitWords'

/* The opener. Behind it a decision tree grows like a larch: applications
   stream in from the left, split at each node and settle on a leaf
   (_lib/scenes.js, "tree"). */
export function Hero({ hero }: { hero: Home['hero'] }) {
  return (
    <section className="ph ph-first rm-spruce" id="top" aria-labelledby="hero-h">
      <div className="ph-media">
        <canvas className="scene" data-scene="tree" aria-hidden="true"></canvas>
        <div className="ph-overlay ov-hero" aria-hidden="true"></div>
      </div>
      <div className="ph-inner wrap">
        <div className="ph-copy">
          <p className="eyebrow-serif" data-at-fade="">
            {hero.eyebrow}
          </p>
          <h1 id="hero-h" className="t-h1" data-at="">
            <SplitWords text={hero.headline} />
          </h1>
          <LeadForm
            placeholder={hero.emailPlaceholder}
            button={hero.buttonLabel}
            thanks={hero.thanksMessage}
            invalid={hero.invalidMessage}
          />
          <p className="fine" data-at-fade="">
            {hero.finePrint}
          </p>
        </div>
      </div>
      <MotionButton />
    </section>
  )
}
