/* Larch Credit on a phone: the score counts up to 712 against a cutoff of 660, four reasons arrive with their bars, and the decision appears. A 12 s loop (css/assets.css). */
import { v } from '../_lib/v'

export function CreditPicture() {
  return (
    <div className="asset a-credit" role="img" aria-label="Larch Credit on a phone. Application LA-20931, a line of credit for 85,000 dollars, scores 712 against a cutoff of 660. Four reasons are listed: payment history plus 48, cash-flow coverage plus 31, utilisation minus 22, recent enquiries minus 8. Decision: approved.">
      <div className="phone">
        <div className="phone-screen">
          <div className="ps-status"><span>9:41</span><span className="ps-sig"><i></i><i></i><i></i></span></div>
          <div className="ps-bar"><span className="ps-mark"><svg viewBox="0 0 24 24"><path d="M12 3v18M12 7.5 8.6 10.4M12 7.5l3.4 2.9M12 11.5l-5 4M12 11.5l5 4M12 15.5l-6.5 5M12 15.5l6.5 5" /></svg>credit</span><span className="ps-id">LA-20931</span></div>
          <div className="ps-who">
            <span className="ps-avatar">MK</span>
            <span className="ps-name"><b>Marlow &amp; Kent Joinery</b><small>Line of credit &middot; $85,000</small></span>
          </div>
          <div className="ps-dial">
            <span className="ps-dial-arc"><svg viewBox="0 0 200 112"><path className="dial-track" d="M20 100a80 80 0 0 1 160 0" /><path className="dial-fill" pathLength="100" d="M20 100a80 80 0 0 1 160 0" /><path className="dial-cut" d="M142 20.4 132.6 38.1" /></svg>
            <span className="dial-num"></span></span>
            <span className="dial-cap">Larch score &middot; cutoff 660</span>
          </div>
          <ul className="ps-reasons" role="list">
            <li style={v({ '--i': '0', '--w': '1' })}><span>Payment history, 6 years on time</span><b className="up">+48</b><i></i></li>
            <li style={v({ '--i': '1', '--w': '.65' })}><span>Cash-flow coverage 1.8&times;</span><b className="up">+31</b><i></i></li>
            <li style={v({ '--i': '2', '--w': '.46' })}><span>Utilisation 74%</span><b className="down">&minus;22</b><i className="neg"></i></li>
            <li style={v({ '--i': '3', '--w': '.17' })}><span>3 enquiries in 90 days</span><b className="down">&minus;8</b><i className="neg"></i></li>
          </ul>
          <div className="ps-decision"><span className="tag tag-good">Approved</span><span>Limit $85,000 &middot; PD 1.9%</span></div>
          <div className="ps-actions"><span>Open file</span><span>Send offer</span></div>
        </div>
      </div>
      <div className="chip chip-a"><span className="chip-dot"></span>Reasons saved to the loan file</div>
      <div className="chip chip-b"><b>credit-pd v4.2</b><span>Validated 14 Sep 2026</span></div>
    </div>
  )
}
