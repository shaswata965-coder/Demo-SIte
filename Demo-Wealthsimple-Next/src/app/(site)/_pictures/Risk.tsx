/* A donut of one-day 99% VaR by factor, rebalancing between before and after a rates hedge. */

export function RiskPicture() {
  return (
    <div className="asset a-risk" role="img" aria-label="A donut of one-day 99 percent value at risk by factor, switching between before and after a rates hedge. Before: rates 34 percent, credit spread 22, equity 18, currency 14, commodities 12, total 41.2 million dollars. After: rates 21 percent, credit spread 26, equity 22, currency 17, commodities 14, total 33.8 million dollars.">
      <div className="donut-wrap">
        <svg className="donut" viewBox="0 0 200 200">
          <circle className="d-track" cx="100" cy="100" r="74" />
          <circle className="d-seg ds1" cx="100" cy="100" r="74" pathLength="100" />
          <circle className="d-seg ds2" cx="100" cy="100" r="74" pathLength="100" />
          <circle className="d-seg ds3" cx="100" cy="100" r="74" pathLength="100" />
          <circle className="d-seg ds4" cx="100" cy="100" r="74" pathLength="100" />
          <circle className="d-seg ds5" cx="100" cy="100" r="74" pathLength="100" />
        </svg>
        <div className="donut-mid">
          <span className="dm-cap">99% VaR, 1 day</span>
          <span className="dm-val swap"><span className="v-a">$41.2M</span><span className="v-b">$33.8M</span></span>
          <span className="dm-state swap"><span className="v-a">Before hedge</span><span className="v-b">After rates hedge</span></span>
        </div>
      </div>
      <ul className="legend" role="list">
        <li className="lg1"><i></i>Rates<b className="swap"><span className="v-a">34%</span><span className="v-b">21%</span></b></li>
        <li className="lg2"><i></i>Credit spread<b className="swap"><span className="v-a">22%</span><span className="v-b">26%</span></b></li>
        <li className="lg3"><i></i>Equity<b className="swap"><span className="v-a">18%</span><span className="v-b">22%</span></b></li>
        <li className="lg4"><i></i>Currency<b className="swap"><span className="v-a">14%</span><span className="v-b">17%</span></b></li>
        <li className="lg5"><i></i>Commodities<b className="swap"><span className="v-a">12%</span><span className="v-b">14%</span></b></li>
      </ul>
    </div>
  )
}
