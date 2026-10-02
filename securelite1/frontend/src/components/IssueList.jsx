import { useState } from "react";
import { motion } from "framer-motion";

const severityLabel = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info"
};

export default function IssueList({ issues = [], fixes = [] }) {
  const [activeIssue, setActiveIssue] = useState(-1);

  return (
    <section className="panel issue-panel">
      <div className="panel-header">
        <h3>Latest findings</h3>
        <span>{issues.length} issue(s)</span>
      </div>
      {issues.length === 0 ? (
        <p className="empty-state">No issues found in the latest scan.</p>
      ) : (
        <div className="issue-list">
          {issues.map((issue, index) => {
            const expanded = activeIssue === index;

            return (
              <motion.article
                key={`${issue.title}-${index}`}
                className={`issue-card ${expanded ? "expanded" : ""}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01, boxShadow: "0 18px 48px rgba(20, 33, 61, 0.12)" }}
              >
                <div className="issue-card-head">
                  <div className={`severity-badge ${issue.severity}`}>{severityLabel[issue.severity]}</div>
                  <span className="issue-source">{issue.scanner || "scanner"}</span>
                </div>
                <h4>{issue.title}</h4>
                <p>{issue.plainEnglish}</p>
                <div className="issue-note">
                  <strong>Recommended next step:</strong> {issue.recommendation}
                </div>
                <div className="issue-actions">
                  <button
                    className="secondary-button issue-fix-button"
                    type="button"
                    onClick={() => setActiveIssue(expanded ? -1 : index)}
                  >
                    {expanded ? "Hide fix guide" : "Fix this"}
                  </button>
                </div>

                {expanded ? (
                  <div className="fix-guide">
                    <div className="fix-guide-block">
                      <strong>How to fix this</strong>
                      <ul className="fix-step-list">
                        {(issue.howToFix || []).map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {issue.sampleFix ? (
                      <div className="fix-guide-block">
                        <strong>Simple example</strong>
                        <code className="fix-code">{issue.sampleFix}</code>
                      </div>
                    ) : null}

                    {issue.technicalDetails ? (
                      <div className="fix-guide-block">
                        <strong>Technical detail</strong>
                        <p>{issue.technicalDetails}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </motion.article>
            );
          })}
        </div>
      )}

      {fixes.length ? (
        <div className="fix-list">
          <div className="panel-header">
            <h3>Quick fix plan</h3>
            <span>Start here</span>
          </div>
          {fixes.map((fix, index) => (
            <div className="fix-row" key={`${fix.label}-${index}`}>
              <strong>{fix.label}</strong>
              <span>{fix.action}</span>
              {(fix.steps || []).length ? (
                <ul className="fix-step-list compact">
                  {fix.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
