export default function TrustedBySection() {
  const logos = ["Astra Commerce", "Northstar Health", "Lumen Retail", "Atlas Ventures", "CloudGrid"];

  return (
    <section className="marketing-section trust-section">
      <div className="section-heading compact">
        <span className="eyebrow">Trusted by growing digital teams</span>
        <h2>Security credibility without enterprise complexity</h2>
      </div>
      <div className="logo-cloud">
        {logos.map((logo) => (
          <div key={logo} className="logo-pill">
            {logo}
          </div>
        ))}
      </div>
      <div className="trust-metrics">
        <div className="mini-card">
          <strong>99.9%</strong>
          <p>scan engine uptime across key modules</p>
        </div>
        <div className="mini-card">
          <strong>&lt; 60 sec</strong>
          <p>typical first-pass scan experience</p>
        </div>
        <div className="mini-card">
          <strong>Plain English</strong>
          <p>built for owners, marketers, and small teams</p>
        </div>
      </div>
    </section>
  );
}
