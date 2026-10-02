import { motion } from "framer-motion";
import LoadingAnimation from "./LoadingAnimation.jsx";
import ScanStepTracker from "./ScanStepTracker.jsx";

export default function ScanOverlay({ visible, targetUrl, activeStep, completedSteps, error, onClose }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="scan-overlay-backdrop">
      <motion.div
        className="scan-overlay-panel"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="scan-overlay-header">
          <div>
            <span className="eyebrow">Live scan overlay</span>
            <h2>Scanning {targetUrl}</h2>
            <p>The 5 security checks will turn green one by one as they complete.</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <div className="banner-error">{error}</div> : null}

        {!error ? (
          <>
            <LoadingAnimation label="Your live website scan is running..." />
            <ScanStepTracker activeStep={activeStep} completedSteps={completedSteps} />
            <section className="panel scan-session-note">
              <div className="panel-header">
                <h3>What happens next</h3>
                <span>Automatic flow</span>
              </div>
              <p>
                After all scan steps finish, SecureLite will open the full report with score, download button, and fix
                guidance.
              </p>
            </section>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
