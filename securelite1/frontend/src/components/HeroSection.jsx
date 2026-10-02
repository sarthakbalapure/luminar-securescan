import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="brand-pill">Live Security Monitoring</div>
        <h1>Website security intelligence that feels enterprise-grade from the first scan</h1>
        <p>
          SecureLite helps small teams detect vulnerabilities, malware reputation issues, SSL weaknesses, and header
          risks with the polish and trust signals of a world-class security platform.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" to="/signup">
            Scan Website
          </Link>
          <Link className="secondary-button" to="/login">
            Watch Demo
          </Link>
        </div>
        <div className="hero-proof">
          <span>PDF reports</span>
          <span>Threat reputation</span>
          <span>Plain-English fixes</span>
        </div>
      </div>
      <motion.div
        className="hero-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="panel hero-console">
          <div className="console-head">
            <span className="console-dot red" />
            <span className="console-dot amber" />
            <span className="console-dot green" />
            <strong>securelite / command center</strong>
          </div>
          <div className="console-grid">
            <div className="mini-card spotlight">
              <span>Security score</span>
              <strong>82 / 100</strong>
              <p>Healthy, but 3 issues need review</p>
            </div>
            <div className="mini-card">
              <span>Threat activity</span>
              <strong>7 alerts</strong>
              <p>2 high priority, 5 medium</p>
            </div>
            <div className="mini-card">
              <span>Latest scan</span>
              <strong>43 sec</strong>
              <p>Full website assessment complete</p>
            </div>
            <div className="mini-card">
              <span>Monitoring</span>
              <strong>12 domains</strong>
              <p>Always-on weekly review active</p>
            </div>
          </div>
          <div className="signal-bars">
            {[72, 55, 84, 38, 91, 62, 78, 88].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
