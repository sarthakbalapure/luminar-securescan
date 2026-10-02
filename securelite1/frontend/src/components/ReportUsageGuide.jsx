export default function ReportUsageGuide({ scan }) {
  if (!scan) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>How to use this report to secure your website</h3>
        <span>Simple next steps</span>
      </div>
      <div className="usage-guide-grid">
        <div className="mini-card">
          <strong>1. Fix the highest-risk issues first</strong>
          <p>
            Start with anything marked critical or high. These are the items most likely to hurt your business if left
            unresolved.
          </p>
        </div>
        <div className="mini-card">
          <strong>2. Share this report with your developer</strong>
          <p>
            Use the plain-English explanations, the fix steps, and the downloadable report so your developer knows what
            to review.
          </p>
        </div>
        <div className="mini-card">
          <strong>3. Work through the quick fix plan</strong>
          <p>
            The quick fix plan highlights the top actions to complete first so you can improve your score with less
            confusion.
          </p>
        </div>
        <div className="mini-card">
          <strong>4. Re-scan after changes</strong>
          <p>
            Once fixes are applied, run another scan to confirm the issue is gone and that your score has improved from{" "}
            {Math.round((scan.securityScore || 0) / 10)}/10.
          </p>
        </div>
      </div>
    </section>
  );
}
