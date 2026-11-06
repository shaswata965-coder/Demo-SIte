/* The model card made like a metal payment card, turning slowly in a passing light. */

export function GovernancePicture() {
  return (
    <div className="asset a-card" role="img" aria-label="A model card made like a metal payment card. Larch model card for credit-pd version 4.2, model number LM 0042 PD 4.2, owned by Credit Risk Analytics, tier 1, validated, review due September 2027. A second card for fraud-gnn version 7.1 sits behind it.">
      <div className="card-tilt"><div className="card-float">
        <div className="mcard mcard-back">
          <span className="mc-brand"><svg viewBox="0 0 24 24"><path d="M12 3v18M12 7.5 8.6 10.4M12 7.5l3.4 2.9M12 11.5l-5 4M12 11.5l5 4M12 15.5l-6.5 5M12 15.5l6.5 5" /></svg>larch</span>
          <span className="mc-num">LM 0117 FR 7.1</span>
          <span className="mc-meta"><span><small>Model</small>fraud-gnn v7.1</span></span>
        </div>
        <div className="mcard mcard-front">
          <span className="mc-brand"><svg viewBox="0 0 24 24"><path d="M12 3v18M12 7.5 8.6 10.4M12 7.5l3.4 2.9M12 11.5l-5 4M12 11.5l5 4M12 15.5l-6.5 5M12 15.5l6.5 5" /></svg>larch</span>
          <span className="mc-kind">Model card</span>
          <span className="mc-seal"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" /><circle cx="32" cy="32" r="21" /><path d="M23 32.5l6.5 6.5 12.5-13.5" /></svg><span>Validated</span></span>
          <span className="mc-num">LM 0042 PD 4.2</span>
          <span className="mc-meta"><span><small>Owner</small>Credit Risk Analytics</span><span><small>Review by</small>09/27</span></span>
          <span className="mc-tier">Tier 1</span>
          <i className="mc-sheen"></i>
        </div>
      </div></div>
      <div className="card-shadow"></div>
    </div>
  )
}
