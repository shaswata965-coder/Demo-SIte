import type { Home } from '@/payload-types'

import { SplitWords } from './SplitWords'

/* The newsletter card: its wordmark beside an illustrated portrait of its
   editor, who tilts her head. */
function Bubble() {
  return (
    <span className="bubble" aria-hidden="true">
      <svg viewBox="0 0 160 160">
        <circle className="bub-bg" cx="80" cy="80" r="80" />
        <g className="bub-person">
          <path className="bub-hair" d="M50 74c-2-30 12-48 32-48s34 16 32 46c-1 22 4 40 10 52H40c6-12 11-28 10-50z" />
          <rect x="71" y="98" width="18" height="22" rx="8" fill="#B07A55" />
          <path className="bub-cloth" d="M30 160c4-28 22-42 50-42s46 14 50 42z" />
          <path fill="none" stroke="#D9C9A8" strokeWidth="2" d="M64 122c4 8 9 12 16 12s12-4 16-12" />
          <g className="bub-head">
            <ellipse cx="80" cy="73" rx="23" ry="28" fill="#C08A63" />
            <path className="bub-hair" d="M56 70c1-19 11-28 25-28 13 0 22 8 24 22-12-1-26-8-32-18-3 10-9 18-17 24z" />
            <circle cx="57" cy="78" r="3.5" fill="#B07A55" /><circle cx="103" cy="78" r="3.5" fill="#B07A55" />
            <circle cx="57" cy="84" r="2" fill="#D9C9A8" /><circle cx="103" cy="84" r="2" fill="#D9C9A8" />
            <path className="bub-eyes" d="M69 77q3-2.6 6 0M85 77q3-2.6 6 0" />
          </g>
        </g>
      </svg>
    </span>
  )
}

export function Newsletter({ newsletter: n }: { newsletter: Home['newsletter'] }) {
  return (
    <section className="news rm-lichen" id="research" aria-labelledby="news-h">
      <div className="wrap">
        <div className="news-card rm-moss" data-reveal="">
          <div className="news-head" data-at-fade="">
            <h2 className="news-wm" id="news-h">
              {n.name}
            </h2>
            <Bubble />
          </div>
          <p className="t-quote news-sub" data-at="">
            <SplitWords text={n.description} />
          </p>
          <div className="news-cta" data-at-fade="">
            <a className="btn btn-ghost btn-lg" href={n.ctaHref}>
              {n.ctaLabel}
            </a>
            <p className="t-small">{n.note}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
