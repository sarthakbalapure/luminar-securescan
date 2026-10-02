export default function InfrastructureCard({ latestScan }) {
  const openPorts = latestScan?.openPorts?.filter((item) => item.status === "open") || [];

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Website health checks</h3>
        <span>{latestScan?.source === "zap" ? "Live ZAP scan" : "Starter mode scan"}</span>
      </div>
      <div className="infrastructure-grid">
        <div className="mini-card">
          <span>SSL status</span>
          <strong>{latestScan?.ssl?.isValid ? "Secure HTTPS found" : "Needs attention"}</strong>
          <p>{latestScan?.ssl?.message || "Run a scan to inspect HTTPS protection."}</p>
        </div>
        <div className="mini-card">
          <span>Open ports</span>
          <strong>{openPorts.length ? openPorts.map((item) => item.port).join(", ") : "No risky ports found"}</strong>
          <p>We flag extra public services that could increase your attack surface.</p>
        </div>
      </div>
    </section>
  );
}
