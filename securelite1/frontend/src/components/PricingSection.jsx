import { Link } from "react-router-dom";

export default function PricingSection() {
  return (
    <section className="marketing-section">
      <div className="section-heading">
        <span className="eyebrow">Pricing</span>
        <h2>Simple pricing designed to convert first-time buyers</h2>
      </div>
      <div className="pricing-card premium">
        <div>
          <h3>Basic Security Monitoring</h3>
          <p>Perfect for Shopify stores, WordPress sites, startup marketing pages, and agency client websites.</p>
        </div>
        <div className="price-block">
          <strong>Rs 50</strong>
          <span>per month</span>
        </div>
        <div className="pricing-points">
          <span>10 scans per month</span>
          <span>Live scan workflow and downloadable PDF reports</span>
          <span>Malware reputation, SSL, headers, and vulnerability checks</span>
          <span>Action-oriented fix guidance and recurring monitoring</span>
        </div>
        <Link className="primary-button" to="/signup">
          Choose Basic
        </Link>
      </div>
    </section>
  );
}
