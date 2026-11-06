import { v } from '../_lib/v'

/* A live payments monitor whose feed never stops, a few payments held or
   sent for review, and an open case: seven accounts around one device,
   money moving round the ring and out to a new wire payee. The feed is
   rendered twice so its scroll loops seamlessly (styles/assets.css). */

type Row = { time: string; what: string; amount: string; risk: number; status: 'Cleared' | 'Held' | 'Review' }

const FEED: Row[] = [
  { time: '10:42:07', what: 'E-transfer · ••4417', amount: '$1,240.00', risk: 0.08, status: 'Cleared' },
  { time: '10:42:09', what: 'Card · Corner Grocer', amount: '$36.18', risk: 0.02, status: 'Cleared' },
  { time: '10:42:11', what: 'Wire · new payee', amount: '$48,500.00', risk: 0.94, status: 'Held' },
  { time: '10:42:12', what: 'E-transfer · ••7730', amount: '$9,800.00', risk: 0.71, status: 'Review' },
  { time: '10:42:15', what: 'Card · Northline Transit', amount: '$3.35', risk: 0.01, status: 'Cleared' },
  { time: '10:42:16', what: 'Bill pay · Hydro', amount: '$142.60', risk: 0.03, status: 'Cleared' },
  { time: '10:42:18', what: 'E-transfer · ••5582', amount: '$9,950.00', risk: 0.83, status: 'Held' },
  { time: '10:42:21', what: 'Card · Atlas Fuel', amount: '$64.02', risk: 0.04, status: 'Cleared' },
  { time: '10:42:23', what: 'Payroll deposit', amount: '$2,615.44', risk: 0.01, status: 'Cleared' },
  { time: '10:42:24', what: 'Wire · offshore', amount: '$31,000.00', risk: 0.91, status: 'Held' },
  { time: '10:42:27', what: 'Card · Fieldnote Books', amount: '$22.50', risk: 0.02, status: 'Cleared' },
  { time: '10:42:29', what: 'E-transfer · ••1206', amount: '$400.00', risk: 0.06, status: 'Cleared' },
]

const ROW_CLASS = { Cleared: 'row', Held: 'row hot', Review: 'row warm' } as const
const TAG_CLASS = { Cleared: 'tag tag-good', Held: 'tag tag-bad', Review: 'tag tag-warn' } as const

function FeedSet({ hidden }: { hidden?: boolean }) {
  return (
    <div className="feed-set" aria-hidden={hidden || undefined}>
      {FEED.map((r) => (
        <div className={ROW_CLASS[r.status]} key={r.time}>
          <span className="c-time">{r.time}</span>
          <span>{r.what}</span>
          <span className="c-amt">{r.amount}</span>
          <span className="c-risk">
            <i style={v({ '--r': r.risk })}></i>
            {r.risk.toFixed(2)}
          </span>
          <span className="c-st">
            <b className={TAG_CLASS[r.status]}>{r.status}</b>
          </span>
        </div>
      ))}
    </div>
  )
}

export function FraudPicture() {
  return (
    <div
      className="asset a-fraud"
      role="img"
      aria-label="Larch payments monitor. A live feed of card payments, e-transfers and wires scrolls by, each with a risk score; most clear, a few are held or sent for review. Beside it an open case: a ring of seven accounts sharing one device, moving money in a loop and out to a new wire payee. 184,300 dollars held, score 0.94, found in 11 minutes."
    >
      <div className="win">
        <div className="win-bar">
          <i></i>
          <i></i>
          <i></i>
          <span>Payments monitor</span>
          <span className="win-live">Live</span>
        </div>
        <div className="feed-head">
          <span className="c-time">Time</span>
          <span>Payment</span>
          <span className="c-amt">Amount</span>
          <span className="c-risk">Risk</span>
          <span className="c-st">Status</span>
        </div>
        <div className="feed">
          <div className="feed-track">
            <FeedSet />
            <FeedSet hidden />
          </div>
        </div>
      </div>
      <div className="case">
        <div className="case-head">
          <b className="tag tag-bad">Held</b>
          <span>Case 4471 · ring of 7 accounts</span>
        </div>
        <svg className="net" viewBox="0 0 240 172">
          <path className="net-in" d="M24 26C48 30 62 40 77 50.7" />
          <path className="net-out" d="M173.6 97.2C196 110 206 126 216 148" />
          <path className="net-ring" d="M120 30 163 50.7 173.6 97.2 143.9 134.6 96.1 134.6 66.4 97.2 77 50.7Z" />
          <path
            className="net-spoke"
            d="M120 85 120 30M120 85 163 50.7M120 85 173.6 97.2M120 85 143.9 134.6M120 85 96.1 134.6M120 85 66.4 97.2M120 85 77 50.7"
          />
          <circle className="net-pulse" cx="120" cy="85" r="12" />
          <rect className="net-dev" x="111" y="76" width="18" height="18" rx="4" />
          <g className="net-acc">
            <circle cx="120" cy="30" r="6.5" />
            <circle cx="163" cy="50.7" r="6.5" />
            <circle cx="173.6" cy="97.2" r="6.5" />
            <circle cx="143.9" cy="134.6" r="6.5" />
            <circle cx="96.1" cy="134.6" r="6.5" />
            <circle cx="66.4" cy="97.2" r="6.5" />
            <circle cx="77" cy="50.7" r="6.5" />
          </g>
          <circle className="net-ext" cx="24" cy="26" r="5" />
          <rect className="net-ext" x="211" y="143" width="10" height="10" rx="2" transform="rotate(45 216 148)" />
          <text className="net-t" x="32" y="17">
            Money in
          </text>
          <text className="net-t" x="204" y="166" textAnchor="end">
            New payee
          </text>
          <text className="net-t" x="120" y="112" textAnchor="middle">
            1 device
          </text>
        </svg>
        <div className="case-foot">
          <span>
            <small>Held</small>$184,300
          </span>
          <span>
            <small>Score</small>0.94
          </span>
          <span>
            <small>Found in</small>11 min
          </span>
        </div>
      </div>
    </div>
  )
}
