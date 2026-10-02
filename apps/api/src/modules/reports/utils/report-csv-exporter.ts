import type { ReportData } from "./report-data-builder";

const columns = ["Finding ID", "Title", "Severity", "Status", "Source", "Asset URL", "Affected URL", "OWASP Mapping", "CWE", "Evidence Summary", "Business Impact", "Technical Impact", "Remediation Summary", "Retest Steps", "First Detected", "Last Detected"];

export function exportFindingsCsv(data: ReportData) {
  const rows = data.findings.map((finding) => [
    finding.id, finding.title, finding.severity, finding.status, finding.sourceLabel, data.asset.url,
    finding.affectedUrl ?? "", finding.owaspMapping.join("; "), finding.cwe ?? "", finding.evidenceSummary,
    finding.businessImpact, finding.technicalImpact, finding.remediationSummary, finding.retestSteps,
    finding.firstDetectedAt, finding.lastDetectedAt,
  ]);
  return `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
