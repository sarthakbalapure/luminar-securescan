"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProtectedShell } from "../../components/protected-shell";
import { Badge, Card, EmptyState, ErrorState, SeverityBadge, Skeleton, StatusBadge } from "../../components/ui";
import { apiRequest, downloadApiFile } from "../../lib/api";
import { formatDate, severities } from "../../lib/security-ui";
import { planDisplayName, type SubscriptionOverview } from "../../lib/subscriptions";

type Asset = { id: string; name: string; url: string; riskLevel: string; _count?: { scans: number; findings: number } };
type Scan = { id: string; status: string; createdAt: string; completedAt?: string | null; securityScore?: string | number | null; asset: { name: string; url: string }; _count?: { findings: number } };
type Finding = { id: string; title: string; severity: string; status: string; category: string; evidenceSummary: string };
type Report = { id: string; reportType: string; generatedAt: string };
type Summary = {
  securityScore: string | number | null;
  totalAssets: number;
  totalScans: number;
  criticalFindings: number;
  highFindings: number;
  latestScanStatus: string | null;
  reportsGenerated: number;
  subscription: SubscriptionOverview | null;
};

const severityColors: Record<string, string> = {
  CRITICAL: "#B42318",
  HIGH: "#C2410C",
  MEDIUM: "#B54708",
  LOW: "#0F766E",
  INFO: "#475569",
};

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<Asset[]>("/assets"),
      apiRequest<Scan[]>("/scans"),
      apiRequest<Finding[]>("/findings"),
      apiRequest<Report[]>("/reports"),
      apiRequest<Summary>("/dashboard/summary"),
    ])
      .then(([nextAssets, nextScans, nextFindings, nextReports, nextSummary]) => {
        setAssets(nextAssets);
        setScans(nextScans);
        setFindings(nextFindings);
        setReports(nextReports);
        setSummary(nextSummary);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Dashboard data could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const openFindings = findings.filter((finding) => finding.status !== "FIXED" && finding.status !== "FALSE_POSITIVE");
  const counts = Object.fromEntries(severities.map((severity) => [severity, openFindings.filter((finding) => finding.severity === severity).length])) as Record<string, number>;
  const latestScan = scans[0];
  const score = summary?.securityScore ?? latestScan?.securityScore ?? "N/A";
  const topFindings = [...openFindings].sort((a, b) => severities.indexOf(a.severity as never) - severities.indexOf(b.severity as never)).slice(0, 5);
  const riskData = useMemo(() => ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((risk) => ({ risk, assets: assets.filter((asset) => asset.riskLevel === risk).length })), [assets]);
  const trendData = useMemo(() => [...scans].reverse().slice(-8).map((scan, index) => ({ name: `S${index + 1}`, score: Number(scan.securityScore ?? 0) })), [scans]);

  return (
    <ProtectedShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-signal">LuminarIQ SecureScan</p>
          <h1 className="text-3xl font-semibold text-ink">Security posture dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">A concise view of risk, scan health, and the next fixes to prioritize.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white" href={assets.length ? "/assets" : "/projects"}>Scan website</Link>
          <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href="/scans">View scans</Link>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <DashboardSkeleton /> : (
        <div className="space-y-6">
          {summary?.subscription ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Current subscription</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink">{planDisplayName(summary.subscription.subscription.planCode)}</h2>
                  <p className="mt-1 text-sm text-slate-600">Valid until {formatDate(summary.subscription.subscription.validTo)}</p>
                </div>
                <Link href="/pricing" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink">View plans</Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SubscriptionMetric label="Scans used this month" value={`${summary.subscription.usage.scansUsed} / ${summary.subscription.subscription.monthlyScanLimit}`} />
                <SubscriptionMetric label="Scans remaining" value={String(summary.subscription.scansRemaining)} />
                <SubscriptionMetric label="Fix requests used" value={`${summary.subscription.usage.fixRequestsUsed} / ${summary.subscription.subscription.monthlyFixRequestLimit}`} />
                <SubscriptionMetric label="Daily scan" value={summary.subscription.subscription.dailyScanEnabled ? "Enabled" : "Not available"} />
              </div>
              {summary.subscription.scanUsagePercent >= 100 ? <p className="mt-4 text-sm font-medium text-red-700">Monthly scan limit reached. Please upgrade your plan.</p> : summary.subscription.scanUsagePercent >= 80 ? <p className="mt-4 text-sm font-medium text-amber-800">You have used 80% of your monthly scan limit.</p> : null}
              {summary.subscription.subscription.dailyScanEnabled ? <p className="mt-3 text-sm text-slate-600">{summary.subscription.dailyScanMessage}</p> : null}
            </Card>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
            <Card>
              <p className="text-sm font-medium text-slate-600">Latest security score</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-6xl font-semibold text-ink">{score}</span>
                {score !== "N/A" ? <span className="pb-2 text-sm text-slate-600">/ 100</span> : null}
              </div>
              <p className="mt-4 text-sm text-slate-600">{latestScan ? `${latestScan.asset.name} scanned ${formatDate(latestScan.completedAt ?? latestScan.createdAt)}` : "Run a scan to calculate your first score."}</p>
            </Card>
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="p-4">
                <p className="text-sm font-medium text-slate-600">Total Assets</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{summary?.totalAssets ?? assets.length}</p>
                <p className="text-sm text-slate-600">Owned assets</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-medium text-slate-600">Total Scans</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{summary?.totalScans ?? scans.length}</p>
                <p className="text-sm text-slate-600">Scan history</p>
              </Card>
              {severities.map((severity) => (
                <Card key={severity} className="p-4">
                  <SeverityBadge severity={severity} />
                  <p className="mt-3 text-3xl font-semibold text-ink">{counts[severity]}</p>
                  <p className="text-sm text-slate-600">Open {severity.toLowerCase()}</p>
                </Card>
              ))}
              <Card className="p-4">
                <p className="text-sm font-medium text-slate-600">Reports Generated</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{summary?.reportsGenerated ?? reports.length}</p>
                <p className="text-sm text-slate-600">Available reports</p>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="font-semibold text-ink">Latest scan status</h2>
              {latestScan ? (
                <div className="mt-4 space-y-2">
                  <StatusBadge status={latestScan.status} />
                  <p className="font-medium text-ink">{latestScan.asset.name}</p>
                  <p className="text-sm text-slate-600">{latestScan.asset.url}</p>
                  <Link className="text-sm font-medium text-signal" href={`/scans/${latestScan.id}`}>Open scan</Link>
                </div>
              ) : <p className="mt-4 text-sm text-slate-600">No scans yet.</p>}
            </Card>
            <Card className="lg:col-span-2">
              <h2 className="font-semibold text-ink">Risk trend</h2>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#0F766E" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <h2 className="font-semibold text-ink">Top 5 findings</h2>
              <div className="mt-4 space-y-3">
                {topFindings.map((finding) => (
                  <Link key={finding.id} href={`/findings/${finding.id}`} className="block rounded-md border border-slate-200 p-3 hover:border-signal">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-ink">{finding.title}</h3>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{finding.category}</p>
                  </Link>
                ))}
                {!topFindings.length ? <EmptyState title="No open findings" detail="New findings will appear here after scans complete." /> : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-ink">Assets by risk level</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskData}>
                    <XAxis dataKey="risk" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="assets">
                      {riskData.map((entry) => <Cell key={entry.risk} fill={severityColors[entry.risk]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold text-ink">Recent activity</h2>
              <div className="mt-4 space-y-3">
                {reports[0] ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                    <div>
                      <Link className="font-medium text-ink hover:text-signal" href={`/reports/${reports[0].id}`}>Latest security report</Link>
                      <p className="text-sm text-slate-600">{formatDate(reports[0].generatedAt)}</p>
                    </div>
                    <button className="text-sm font-medium text-signal" onClick={() => downloadApiFile(`/reports/${reports[0].id}/download`, `luminar-securescan-${reports[0].id}.pdf`)}>Download</button>
                  </div>
                ) : null}
                {scans.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-ink">{scan.asset.name}</p>
                      <p className="text-sm text-slate-600">{formatDate(scan.createdAt)}</p>
                    </div>
                    <StatusBadge status={scan.status} />
                  </div>
                ))}
                {!scans.length ? <EmptyState title="No activity yet" detail="Scans and status updates will show here." /> : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-ink">Recommended next actions</h2>
              <div className="mt-4 space-y-3">
                <Action text="Fix critical and high findings first." active={counts.CRITICAL + counts.HIGH > 0} />
                <Action text="Run a scan for every internet-facing website asset." active={assets.some((asset) => !asset._count?.scans)} />
                <Action text="Review findings marked retest required." active={findings.some((finding) => finding.status === "RETEST_REQUIRED")} />
                <Action text="Generate latest security report." active={scans.some((scan) => scan.status === "COMPLETED") && reports.length === 0} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </ProtectedShell>
  );
}

function SubscriptionMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-ink">{value}</p></div>;
}

function Action({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
      <p className="text-sm text-slate-700">{text}</p>
      <Badge tone={active ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}>{active ? "Next" : "OK"}</Badge>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-56" />
    </div>
  );
}
