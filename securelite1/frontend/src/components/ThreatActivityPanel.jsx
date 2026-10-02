export default function ThreatActivityPanel({ scans = [] }) {
  const trend = scans.slice(0, 7).map((scan, index) => ({
    label: `S${index + 1}`,
    value: Math.max(12, Math.min(100, 100 - (scan.securityScore || 0)))
  }));

  const alerts = scans
    .flatMap((scan) => (scan.issues || []).map((issue) => ({ domain: scan.domain, title: issue.title, severity: issue.severity })))
    .slice(0, 5);

  return (
    <section className="dashboard-ops-grid">
      <div className="panel ops-chart-panel">
        <div className="panel-header">
          <h3>Threat Activity</h3>
          <span>Last 7 scans</span>
        </div>
        <div className="chart-bars large">
          {trend.length ? (
            trend.map((item) => (
              <div key={item.label} className="chart-bar-wrap">
                <div className="chart-bar cyan" style={{ height: `${item.value}%` }} />
                <span>{item.label}</span>
              </div>
            ))
          ) : (
            <p className="empty-state">Run scans to see threat activity trends.</p>
          )}
        </div>
      </div>
      <div className="panel alerts-panel">
        <div className="panel-header">
          <h3>Security Alerts</h3>
          <span>Recent findings</span>
        </div>
        <div className="alerts-list">
          {alerts.length ? (
            alerts.map((alert, index) => (
              <div key={`${alert.domain}-${index}`} className="alert-row">
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.domain}</span>
                </div>
                <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
              </div>
            ))
          ) : (
            <p className="empty-state">No alerts yet. Your next scan will populate this panel.</p>
          )}
        </div>
      </div>
    </section>
  );
}
