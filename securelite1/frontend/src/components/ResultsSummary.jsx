import { motion } from "framer-motion";
import AnimatedScoreRing from "./AnimatedScoreRing.jsx";

const scanTypeLabels = {
  sql: "SQL Injection",
  xss: "XSS / CSRF",
  ssl: "SSL / HTTPS",
  ports: "Open Ports",
  config: "Config / Headers",
  malware: "Malware / Reputation"
};

export default function ResultsSummary({ scan }) {
  return (
    <section className="results-grid">
      <motion.div className="panel results-hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="eyebrow">Latest results</span>
          <h2>{scan.domain}</h2>
          <p>{scan.summary}</p>
          <div className="results-meta">
            <span>Scan type: {scan.scanType}</span>
            <span>Source: {scan.source}</span>
            <span>Scanned: {new Date(scan.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <AnimatedScoreRing score={scan.securityScore} riskLevel={scan.riskLevel} />
      </motion.div>

      <motion.div
        className="panel scan-types-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="panel-header">
          <h3>Scan modules</h3>
          <span>{Object.keys(scan.findingsByType || {}).length} checks</span>
        </div>
        <div className="scan-type-grid">
          {Object.entries(scan.findingsByType || {}).map(([key, value]) => (
            <div className="scan-type-card" key={key}>
              <strong>{scanTypeLabels[key] || key}</strong>
              <span>{value.status}</span>
              <p>{value.issues?.length || 0} issue(s)</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
