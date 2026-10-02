import { motion } from "framer-motion";

const radius = 60;
const circumference = 2 * Math.PI * radius;

export default function AnimatedScoreRing({ score = 0, riskLevel = "Low" }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (safeScore / 100) * circumference;
  const tone = safeScore >= 80 ? "#2a9d6f" : safeScore >= 55 ? "#f4a340" : "#d64545";

  return (
    <div className="score-ring-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} stroke="rgba(20, 33, 61, 0.08)" strokeWidth="14" fill="none" />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          stroke={tone}
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          strokeDasharray={circumference}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="score-ring-label">
        <strong>{safeScore}</strong>
        <span>{riskLevel} risk</span>
      </div>
    </div>
  );
}
