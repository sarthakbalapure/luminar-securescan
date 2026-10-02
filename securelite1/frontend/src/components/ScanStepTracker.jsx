import { motion } from "framer-motion";

const defaultSteps = [
  {
    key: "sql",
    title: "Checking form and URL injection",
    description: "We are reviewing whether unsafe input could reach your database."
  },
  {
    key: "xss",
    title: "Checking browser script safety",
    description: "We are testing for XSS and request-forgery style weaknesses."
  },
  {
    key: "ssl",
    title: "Checking HTTPS protection",
    description: "We are verifying certificate quality and secure connection settings."
  },
  {
    key: "ports",
    title: "Checking open internet-facing services",
    description: "We are reviewing whether extra ports are visible from the internet."
  },
  {
    key: "config",
    title: "Checking security headers and settings",
    description: "We are validating browser-facing protection headers and configuration."
  },
  {
    key: "malware",
    title: "Checking malware and domain reputation",
    description: "We are reviewing whether reputation services consider this URL risky or suspicious."
  }
];

export default function ScanStepTracker({ activeStep = -1, completedSteps = [] }) {
  return (
    <section className="panel scan-step-panel">
      <div className="panel-header">
        <h3>Security scan progress</h3>
        <span>{completedSteps.length}/5 completed</span>
      </div>
      <div className="scan-step-list">
        {defaultSteps.map((step, index) => {
          const completed = completedSteps.includes(step.key);
          const active = !completed && index === activeStep;

          return (
            <motion.div
              key={step.key}
              className={`scan-step-card ${completed ? "done" : active ? "active" : ""}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="scan-step-badge">{completed ? "Done" : active ? "Scanning" : `Step ${index + 1}`}</div>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
