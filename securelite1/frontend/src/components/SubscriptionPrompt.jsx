import { motion } from "framer-motion";

export default function SubscriptionPrompt({ scan }) {
  const tenPointScore = Math.max(1, Math.round((scan?.securityScore || 0) / 10));

  if (!scan || scan.securityScore >= 95) {
    return null;
  }

  return (
    <motion.section className="panel subscription-prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <span className="eyebrow">Basic subscription</span>
        <h3>Your website is currently {tenPointScore}/10 for security</h3>
        <p>
          It is not fully secure yet. A Basic subscription helps you keep scanning regularly, catch new issues
          earlier, and follow a simple fix plan over time.
        </p>
      </div>
      <div className="subscription-highlight">
        <strong>Buy Basic monitoring</strong>
        <span>Weekly scans, progress tracking, and simpler next-step guidance</span>
        <button className="primary-button" type="button">
          Buy Basic subscription
        </button>
      </div>
    </motion.section>
  );
}
