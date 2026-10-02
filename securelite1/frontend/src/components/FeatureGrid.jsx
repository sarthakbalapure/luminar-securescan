export default function FeatureGrid() {
  const features = [
    ["Vulnerability Detection", "Catch injection risks, XSS issues, port exposure, and configuration gaps."],
    ["Malware Scanning", "Check URL reputation and detect suspicious signals before visitors lose trust."],
    ["SSL Analysis", "Review HTTPS health, TLS handshake details, and certificate validity with clarity."],
    ["Security Headers Check", "Find missing browser protections like CSP, HSTS, X-Frame-Options, and more."],
    ["AI Recommendations", "Translate technical findings into direct next steps for owners and developers."],
    ["PDF Reports", "Share polished downloadable reports with stakeholders, agencies, or engineering teams."]
  ];

  return (
    <section className="marketing-section">
      <div className="section-heading">
        <span className="eyebrow">Core platform</span>
        <h2>Everything needed for a modern cybersecurity SaaS experience</h2>
      </div>
      <div className="feature-grid six-up">
        {features.map(([title, text]) => (
          <article className="panel feature-card" key={title}>
            <div className="feature-icon" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
