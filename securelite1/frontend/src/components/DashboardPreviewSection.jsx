export default function DashboardPreviewSection() {
  return (
    <section className="marketing-section dashboard-preview-section">
      <div className="section-heading">
        <span className="eyebrow">Dashboard preview</span>
        <h2>Built like a lightweight security operations center</h2>
      </div>
      <div className="dashboard-preview-grid">
        <div className="panel preview-kpis">
          {[
            ["Websites scanned", "148"],
            ["Critical vulnerabilities", "7"],
            ["Average security score", "82"],
            ["Active monitoring", "12 domains"]
          ].map(([label, value]) => (
            <div key={label} className="mini-card">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="panel preview-chart">
          <div className="panel-header">
            <h3>Security posture trend</h3>
            <span>Last 30 days</span>
          </div>
          <div className="chart-bars">
            {[38, 55, 44, 72, 63, 81, 78, 92].map((height, index) => (
              <div key={index} className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
