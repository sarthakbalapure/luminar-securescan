export default function DashboardInsights({ scans = [] }) {
  const totalScans = scans.length;
  const criticalCount = scans.reduce(
    (count, scan) => count + (scan.issues || []).filter((issue) => ["critical", "high"].includes(issue.severity)).length,
    0
  );
  const averageScore =
    totalScans > 0 ? Math.round(scans.reduce((sum, scan) => sum + (scan.securityScore || 0), 0) / totalScans) : 0;
  const activeMonitoring = new Set(scans.map((scan) => scan.domain)).size;

  return (
    <section className="kpi-grid">
      {[
        ["Websites Scanned", totalScans || 0, "Total scans captured in your workspace"],
        ["Critical Vulnerabilities", criticalCount || 0, "High-priority findings that need urgent review"],
        ["Security Score", averageScore ? `${averageScore}/100` : "0/100", "Average posture across recent scans"],
        ["Active Monitoring", activeMonitoring || 0, "Unique domains currently tracked"]
      ].map(([label, value, description]) => (
        <article key={label} className="panel kpi-card">
          <span>{label}</span>
          <strong>{value}</strong>
          <p>{description}</p>
        </article>
      ))}
    </section>
  );
}
