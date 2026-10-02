const findings = [
  {
    severity: "High",
    title: "HTTPS is not enforced",
    status: "Open",
    mapping: "OWASP A02",
    recommendation: "Redirect HTTP to HTTPS and validate certificate automation."
  },
  {
    severity: "Medium",
    title: "Recommended security header is missing",
    status: "Retest Required",
    mapping: "OWASP A05",
    recommendation: "Apply a reviewed browser header baseline across application routes."
  },
  {
    severity: "Info",
    title: "Passive scan alerts imported",
    status: "Open",
    mapping: "OWASP A05",
    recommendation: "Review scanner evidence and schedule a retest after remediation."
  }
];

export function FindingTable() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-base font-semibold text-ink">Current findings</h2>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Export report
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Finding</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Mapping</th>
              <th className="px-4 py-3 font-medium">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {findings.map((finding) => (
              <tr key={finding.title}>
                <td className="px-4 py-3 font-semibold text-ink">{finding.severity}</td>
                <td className="px-4 py-3 text-slate-800">{finding.title}</td>
                <td className="px-4 py-3 text-slate-700">{finding.status}</td>
                <td className="px-4 py-3 text-slate-700">{finding.mapping}</td>
                <td className="max-w-md px-4 py-3 text-slate-600">{finding.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
