/* The opening, after clyde.us's loader. Its whole timeline is CSS (styles/intro.css). */
import { v } from '../_lib/v'

export function Intro({ tagline }: { tagline: string }) {
  return (
    <div className="intro" id="intro" aria-hidden="true">
      <div className="intro-bg"></div>
      <div className="intro-lockup">
        <div className="intro-logo">
          <svg className="intro-mark" viewBox="0 0 120 120">
            <path className="im-line im-trunk" pathLength="1" d="M60 106V14" />
            <path className="im-line im-b1" pathLength="1" d="M60 37.5 43 52" /><path className="im-line im-b1" pathLength="1" d="M60 37.5 77 52" />
            <path className="im-line im-b2" pathLength="1" d="M60 57.5 35 77.5" /><path className="im-line im-b2" pathLength="1" d="M60 57.5 85 77.5" />
            <path className="im-line im-b3" pathLength="1" d="M60 77.5 27.5 102.5" /><path className="im-line im-b3" pathLength="1" d="M60 77.5 92.5 102.5" />
            <circle className="im-tip" style={v({ '--k': '0' })} cx="43" cy="52" r="4.6" /><circle className="im-tip" style={v({ '--k': '1' })} cx="77" cy="52" r="4.6" />
            <circle className="im-tip" style={v({ '--k': '2' })} cx="35" cy="77.5" r="4.6" /><circle className="im-tip" style={v({ '--k': '3' })} cx="85" cy="77.5" r="4.6" />
            <circle className="im-tip" style={v({ '--k': '4' })} cx="27.5" cy="102.5" r="4.6" /><circle className="im-tip" style={v({ '--k': '5' })} cx="92.5" cy="102.5" r="4.6" />
          </svg>
          <span className="intro-word"><span style={v({ '--i': '0', '--sx': '-.95em' })}>l</span><span style={v({ '--i': '1', '--sx': '-.48em' })}>a</span><span style={v({ '--i': '2', '--sx': '0em' })}>r</span><span style={v({ '--i': '3', '--sx': '.48em' })}>c</span><span style={v({ '--i': '4', '--sx': '.95em' })}>h</span></span>
          <span className="intro-burst"><i style={v({ '--x': '0.924', '--y': '0.383', '--a': '103.0deg', '--k': '0' })}></i><i style={v({ '--x': '0.383', '--y': '0.924', '--a': '143.3deg', '--k': '1' })}></i><i style={v({ '--x': '-0.383', '--y': '0.924', '--a': '-143.3deg', '--k': '2' })}></i><i style={v({ '--x': '-0.924', '--y': '0.383', '--a': '-103.0deg', '--k': '3' })}></i><i style={v({ '--x': '-0.924', '--y': '-0.383', '--a': '-77.0deg', '--k': '4' })}></i><i style={v({ '--x': '-0.383', '--y': '-0.924', '--a': '-36.7deg', '--k': '5' })}></i><i style={v({ '--x': '0.383', '--y': '-0.924', '--a': '36.7deg', '--k': '6' })}></i><i style={v({ '--x': '0.924', '--y': '-0.383', '--a': '77.0deg', '--k': '7' })}></i></span>
        </div>
        <span className="intro-tag"><span>{tagline}</span></span>
      </div>
      <div className="intro-paper"></div>
    </div>
  )
}
