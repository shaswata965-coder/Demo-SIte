import type { Home, Site } from '@/payload-types'

import { ContactEmail } from './ContactEmail'
import { Endings } from './Endings'
import { MotionButton } from './MotionButton'
import { SplitWords } from './SplitWords'

const list = new Intl.ListFormat('en', { type: 'conjunction' })

/* The close. Behind it a loss surface: a point rolls downhill to the
   minimum, the way a model trains, then starts again somewhere else
   (_lib/scenes.js, "loss"). */
export function Close({ close, contact }: { close: Home['close']; contact: Site['contact'] }) {
  const endings = (close.endings ?? []).map((e) => e.word)
  const spoken = `${close.lead} ${list.format(endings.map((w) => w.replace(/[.!?]+$/, '')))}.`
  return (
    <section className="final rm-peat" id="contact" aria-labelledby="final-h">
      <div className="final-media" aria-hidden="true">
        <canvas className="scene" data-scene="loss"></canvas>
      </div>
      <div className="wrap final-inner">
        <h2 id="final-h" className="t-giant final-h">
          <span className="sr-only">{spoken}</span>{' '}
          <span className="final-lead" aria-hidden="true" data-at="crop">
            <SplitWords text={close.lead} crop srText={false} />
          </span>{' '}
          <Endings words={endings} />
        </h2>
        <p className="t-lead final-sub" data-at-fade="">
          {close.sub}
        </p>
        <div className="final-ctas" data-at-fade="">
          <a className="btn btn-solid btn-lg" href="#top">
            {close.ctaLabel}
          </a>
        </div>
        <div className="contact" data-at-fade="">
          <ContactEmail email={contact.email} />
          <p>
            <span className="contact-k">Phone</span> <span className="contact-v">{contact.phone}</span>
          </p>
        </div>
      </div>
      <MotionButton />
    </section>
  )
}
