"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, EmptyState, ErrorState, Select, SeverityBadge, Skeleton, StatusBadge } from "../../../components/ui";
import { apiRequest, downloadApiFile } from "../../../lib/api";
import { formatDate, formatEnum, severities, statuses } from "../../../lib/security-ui";
import { planDisplayName, type SubscriptionOverview } from "../../../lib/subscriptions";

type Finding = {
  id: string;
  title: string;
  severity: string;
  status: string;
  category: string;
  evidenceSummary: string;
  remediationSummary: string;
};
type Scan = {
  id: string;
  scanType: string;
  scanMode?: string;
  scanner?: string;
  targetUrl?: string | null;
  testedParameter?: string | null;
  httpMethod?: string | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  securityScore?: string | number | null;
  asset: { id: string; name: string; url: string; project?: { organizationId: string } };
  jobs: Array<{ id: string; jobType: string; status: string; errorMessage?: string | null }>;
  findings: Finding[];
  reports: Report[];
};
type ReportType = "EXECUTIVE_SUMMARY" | "TECHNICAL_FINDINGS" | "FULL_SECURITY_AUDIT" | "RETEST_REPORT";
type Report = {
  id: string;
  reportType: ReportType | "EXECUTIVE" | "TECHNICAL" | "FULL";
  fileUrl?: string | null;
  generatedAt: string;
};

const reportTypes: Array<{ value: ReportType; label: string }> = [
  { value: "EXECUTIVE_SUMMARY", label: "Executive Summary" },
  { value: "TECHNICAL_FINDINGS", label: "Technical Findings" },
  { value: "FULL_SECURITY_AUDIT", label: "Full Security Audit" },
  { value: "RETEST_REPORT", label: "Retest Report" },
];

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [severity, setSeverity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [reportType, setReportType] = useState<ReportType>("FULL_SECURITY_AUDIT");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportOptions, setReportOptions] = useState({ includeExecutiveSummary: true, includeTechnicalDetails: true, includeRemediation: true, includeEvidence: true, includeAppendix: true });
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Scan>(`/scans/${params.id}`)
      .then(async (nextScan) => {
        setScan(nextScan);
        const organizationId = nextScan.asset.project?.organizationId;
        if (organizationId) {
          const nextSubscription = await apiRequest<SubscriptionOverview>(`/subscriptions/current?organizationId=${encodeURIComponent(organizationId)}`);
          setSubscription(nextSubscription);
        }
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Scan could not be loaded."));
  }, [params.id]);

  const filteredFindings = useMemo(() => {
    if (!scan) return [];
    return scan.findings.filter((finding) => (severity === "ALL" || finding.severity === severity) && (status === "ALL" || finding.status === status));
  }, [scan, severity, status]);

  async function generateReport() {
    if (!scan) return;
    setGenerating(true);
    setError("");
    try {
      const response = await apiRequest<{ message: string; report: Report }>("/reports/generate", {
        method: "POST",
        body: JSON.stringify({ scanId: scan.id, assetId: scan.asset.id, reportType, ...reportOptions }),
      });
      const report = response.report;
      setScan({
        ...scan,
        reports: [...scan.reports.filter((item) => item.reportType !== report.reportType), report],
      });
      setReportModalOpen(false);
      router.push(`/reports/${report.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Report could not be generated.");
    } finally {
      setGenerating(false);
    }
  }

  function downloadReport(report: Report) {
    return downloadApiFile(`/reports/${report.id}/download`, `luminar-securescan-${report.reportType.toLowerCase()}-${scan?.id ?? "scan"}.pdf`);
  }

  return (
    <ProtectedShell>
      {error ? <ErrorState message={error} /> : null}
      {!scan && !error ? <ScanSkeleton /> : null}
      {scan ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">{scan.asset.name}</p>
                <h1 className="text-3xl font-semibold text-ink">Scan results</h1>
                <p className="mt-2 text-sm text-slate-600">{scan.asset.url}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={scan.status} />
                <Button disabled={scan.status !== "COMPLETED"} onClick={() => setReportModalOpen(true)}>Generate report</Button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <Meta label="Scan type" value={formatEnum(scan.scanType)} />
              <Meta label="Scanner" value={scan.scanner === "owasp_zap" ? "OWASP ZAP" : scan.scanner === "nuclei" ? "Nuclei" : scan.scanner === "sqlmap" ? "sqlmap" : "Internal"} />
              <Meta label="Mode" value={scan.scanMode === "zap_full" ? "Full" : scan.scanMode === "nuclei_full" ? "Full Template" : scan.scanMode === "nuclei_cve" ? "CVE" : scan.scanMode === "nuclei_safe_baseline" ? "Safe Baseline" : scan.scanMode === "sqlmap_detection" ? "SQL Injection Detection" : "Baseline"} />
              {scan.scanner === "sqlmap" ? <Meta label="Target endpoint" value={scan.targetUrl ?? scan.asset.url} /> : null}
              {scan.scanner === "sqlmap" ? <Meta label="Tested parameter" value={scan.testedParameter ?? "N/A"} /> : null}
              <Meta label="Started" value={formatDate(scan.startedAt)} />
              <Meta label="Completed" value={formatDate(scan.completedAt)} />
              <Meta label="Security score" value={String(scan.securityScore ?? "N/A")} />
              <Meta label="Findings" value={String(scan.findings.length)} />
            </div>
          </Card>

          {scan.reports.length ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-ink">Generated reports</h2>
                <Link className="text-sm font-medium text-signal" href="/reports">View all reports</Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {scan.reports.map((report) => (
                  <div key={report.id} className="rounded-md border border-slate-200 p-3">
                    <p className="font-medium text-ink">{formatEnum(report.reportType)}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatDate(report.generatedAt)}</p>
                    <Button className="mt-3 w-full bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => downloadReport(report)}>Download PDF</Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-ink">Findings</h2>
              <div className="flex gap-2">
                <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-40">
                  <option value="ALL">All severities</option>
                  {severities.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
                </Select>
                <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-44">
                  <option value="ALL">All statuses</option>
                  {statuses.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
                </Select>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Severity</th>
                    <th className="py-3 pr-4 font-medium">Finding</th>
                    <th className="py-3 pr-4 font-medium">Category</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFindings.map((finding) => (
                    <tr key={finding.id}>
                      <td className="py-3 pr-4"><SeverityBadge severity={finding.severity} /></td>
                      <td className="py-3 pr-4">
                        <Link className="font-medium text-ink hover:text-signal" href={`/findings/${finding.id}`}>{finding.title}</Link>
                        <p className="mt-1 line-clamp-1 text-slate-600">{finding.evidenceSummary}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{finding.category}</td>
                      <td className="py-3 pr-4"><StatusBadge status={finding.status} /></td>
                      <td className="py-3 pr-4"><Link className="font-medium text-signal" href={`/findings/${finding.id}`}>Inspect</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredFindings.length ? <div className="mt-4"><EmptyState title="No findings match this filter" detail="Adjust the filters or review the scan job status below." /></div> : null}
          </Card>

          <section className="grid gap-3 md:grid-cols-2">
            {scan.jobs.map((job) => (
              <Card key={job.id}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-ink">{formatEnum(job.jobType)}</h2>
                  <StatusBadge status={job.status} />
                </div>
                {job.errorMessage ? <p className="mt-2 text-sm text-ember">{job.errorMessage}</p> : null}
              </Card>
            ))}
          </section>
        </div>
      ) : null}
      {reportModalOpen && scan ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
          <Card className="w-full max-w-lg">
            <h2 className="text-xl font-semibold text-ink">Generate security report</h2>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="reportType">Report type</label>
              <Select id="reportType" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
                {reportTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </div>
            {subscription ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-ink">{planDisplayName(subscription.subscription.planCode)} plan</p>
                <p className="mt-1">{subscription.detailedReportsEnabled ? "Your plan includes a Detailed Report with remediation steps." : "Your Plus plan includes a Basic Report."}</p>
                {!subscription.detailedReportsEnabled ? <p className="mt-2 text-amber-800">Detailed remediation steps are available in Pro and Max plans.</p> : null}
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              {([
                ["includeExecutiveSummary", "Executive Summary"],
                ["includeTechnicalDetails", "Technical Details"],
                ["includeRemediation", "Remediation Guidance"],
                ["includeEvidence", "Evidence Summary"],
                ["includeAppendix", "Appendix"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={reportOptions[key]}
                    disabled={Boolean(subscription && !subscription.detailedReportsEnabled && key !== "includeExecutiveSummary")}
                    onChange={(event) => setReportOptions({ ...reportOptions, [key]: event.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={generating} onClick={() => setReportModalOpen(false)}>Cancel</Button>
              <Button disabled={generating} onClick={generateReport}>{generating ? "Generating..." : "Generate Report"}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </ProtectedShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ScanSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44" />
      <Skeleton className="h-80" />
    </div>
  );
}
