import { motion } from "framer-motion";
import AnimatedScoreRing from "./AnimatedScoreRing.jsx";

export default function ScoreCard({ latestScan }) {
  const score = latestScan?.securityScore ?? 100;
  const tone = score >= 80 ? "safe" : score >= 60 ? "warn" : "danger";

  return (
    <motion.section
      className={`score-card ${tone}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 24px 60px rgba(20, 33, 61, 0.16)" }}
    >
      <div>
        <span className="eyebrow">Current score</span>
        <div className="score-card-main">
          <AnimatedScoreRing score={score} riskLevel={latestScan?.riskLevel || "Low"} />
          <div>
            <h3>{score}/100</h3>
            <p>{latestScan?.riskLevel || "Low"} overall risk</p>
          </div>
        </div>
        <p>{latestScan?.summary || "Run your first scan to get a security score."}</p>
      </div>
      <div className="score-meta">
        <span>Last scanned</span>
        <strong>{latestScan ? new Date(latestScan.createdAt).toLocaleString() : "Not yet scanned"}</strong>
      </div>
    </motion.section>
  );
}
