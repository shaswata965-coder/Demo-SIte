import type { Home } from '@/payload-types'

import { v } from '../_lib/v'
import { SplitWords } from './SplitWords'

/* "Why Larch": a coin stack with a larch growing out of it, the statement
   in huge serif rising out of a mask, and the thesis lighting up word by
   word as you read down it. */
export function About({ about }: { about: Home['about'] }) {
  return (
    <section className="about rm-lichen" id="about" aria-labelledby="about-h">
      <div className="wrap about-inner">
        <div className="about-icon" data-icon-fade="" aria-hidden="true">
          <svg viewBox="0 0 180 180">
            <g className="ab-c ab-c1"><path className="ab-coin-side" d="M46 132v14c0 8 20 14 44 14s44-6 44-14v-14" /><ellipse className="ab-coin" cx="90" cy="132" rx="44" ry="14" /></g>
            <g className="ab-c ab-c2"><path className="ab-coin-side" d="M46 112v14c0 8 20 14 44 14s44-6 44-14v-14" /><ellipse className="ab-coin" cx="90" cy="112" rx="44" ry="14" /></g>
            <g className="ab-c ab-c3"><path className="ab-coin-side" d="M46 92v14c0 8 20 14 44 14s44-6 44-14V92" /><ellipse className="ab-coin" cx="90" cy="92" rx="44" ry="14" /></g>
            <path className="ab-tree" d="M90 92V20M90 32l-12 10M90 32l12 10M90 45l-17 14M90 45l17 14M90 58l-22 18M90 58l22 18" />
            <g className="ab-leaves"><circle className="ab-leaf" style={v({ '--k': '0' })} cx="78" cy="42" r="3.4" /><circle className="ab-leaf" style={v({ '--k': '1' })} cx="102" cy="42" r="3.4" /><circle className="ab-leaf" style={v({ '--k': '2' })} cx="73" cy="59" r="3.4" /><circle className="ab-leaf" style={v({ '--k': '3' })} cx="107" cy="59" r="3.4" /><circle className="ab-leaf" style={v({ '--k': '4' })} cx="68" cy="76" r="3.4" /><circle className="ab-leaf" style={v({ '--k': '5' })} cx="112" cy="76" r="3.4" /></g>
          </svg>
        </div>
        <h2 id="about-h" className="t-giant" data-at="crop">
          <SplitWords text={about.heading} crop />
        </h2>
        <p className="t-lead about-text" data-at="" data-lit="">
          <SplitWords text={about.thesis} />
        </p>
        <p className="t-small about-fine">{about.finePrint}</p>
      </div>
    </section>
  )
}
