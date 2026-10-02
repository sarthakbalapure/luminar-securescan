import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function SecurityScannerSection() {
  const [targetUrl, setTargetUrl] = useState("https://yourwebsite.com");

  return (
    <section className="marketing-section scanner-section">
      <div className="scanner-copy">
        <span className="eyebrow">One-click scanner</span>
        <h2>See the full security picture before customers do</h2>
        <p>
          Run vulnerability detection, malware reputation, SSL analysis, and header checks from one secure dashboard.
        </p>
        <form className="hero-scan-form" onSubmit={(event) => event.preventDefault()}>
          <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} type="url" aria-label="Website URL" />
          <Link className="primary-button" to="/signup">
            Scan Website
          </Link>
        </form>
      </div>
      <motion.div
        className="scanner-visual panel"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="scan-rail">
          {[
            ["URL validation", "Completed"],
            ["Vulnerability mapping", "Completed"],
            ["SSL handshake review", "Completed"],
            ["Threat reputation", "Running"],
            ["Report generation", "Queued"]
          ].map(([label, state], index) => (
            <div key={label} className={`scan-rail-item ${index < 3 ? "done" : index === 3 ? "live" : ""}`}>
              <div className="scan-rail-dot" />
              <div>
                <strong>{label}</strong>
                <span>{state}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
