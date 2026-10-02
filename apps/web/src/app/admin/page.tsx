"use client";

import Link from "next/link";
import { Button, Card, ErrorState, Skeleton } from "../../components/ui";
import { downloadApiFile } from "../../lib/api";
import { AdminShell, DateText, StatGrid, StateBadge, useAdminData } from "./admin-components";

type Summary = {
  totalOrganizations: number;
  totalUsers: number;
  totalAssets: number;
  totalScans: number;
  scansToday: number;
  failedScans: number;
  criticalFindingsDetected: number;
  reportsGenerated: number;
  reportsGeneratedToday: number;
  failedReportGenerations: number;
  reportsByType: Array<{ reportType: string; count: number }>;
  mostReportedAssets: Array<{ id?: string; name?: string; url?: string; count: number }>;
  activeSubscriptions: number;
  plusCustomers: number;
  proCustomers: number;
  maxCustomers: number;
  totalScansThisMonth: number;
  fixRequestsOpen: number;
  fixRequestsResolved: number;
  organizationsNearScanLimit: number;
  newUsersToday: number;
  workerQueueDepth: number;
  zapScansToday: number;
  zapBaselineScans: number;
  zapFullScans: number;
  failedZapScans: number;
  averageZapScanDurationSeconds: number;
  nucleiScansToday: number;
  nucleiSafeBaselineScans: number;
  nucleiCveScans: number;
  nucleiFullScans: number;
  failedNucleiScans: number;
  averageNucleiScanDurationSeconds: number;
  sqlmapScansToday: number;
  sqlmapFindings: number;
  failedSqlmapScans: number;
  averageSqlmapScanDurationSeconds: number;
  queue: Record<string, number>;
  recentLogins: Array<{
    id: string;
    loggedInAt: string;
    user: { id: string; name: string; email: string; role: string } | null;
    organization: { id: string; name: string; slug: string };
  }>;
  recentUsers: Array<{ id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }>;
  recentScans: Array<{ id: string; status: string; scanType: string; createdAt: string; asset: { name: string; url: string }; creator: { name: string; email: string } }>;
  failedScanRows: Array<{ id: string; createdAt: string; asset: { name: string; url: string }; jobs: Array<{ errorMessage: string | null }> }>;
  recentAuditLogs: Array<{ id: string; action: string; entityType: string; createdAt: string; user: { name: string; email: string } | null; organization: { name: string } }>;
};

export default function AdminDashboardPage() {
  const { data, error, loading } = useAdminData<Summary>("/admin");

  return (
    <AdminShell>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-40" /> : null}
      {data ? (
        <div className="space-y-6">
          <StatGrid items={[
            { label: "Total organizations", value: data.totalOrganizations },
            { label: "Total users", value: data.totalUsers },
            { label: "Total assets", value: data.totalAssets },
            { label: "Total scans", value: data.totalScans },
            { label: "Failed scans", value: data.failedScans, tone: data.failedScans ? "text-red-700" : "text-ink" },
            { label: "Critical findings", value: data.criticalFindingsDetected, tone: data.criticalFindingsDetected ? "text-red-700" : "text-ink" },
            { label: "Reports generated", value: data.reportsGenerated },
            { label: "Reports today", value: data.reportsGeneratedToday },
            { label: "Failed reports", value: data.failedReportGenerations, tone: data.failedReportGenerations ? "text-red-700" : "text-ink" },
            { label: "Active subscriptions", value: data.activeSubscriptions },
            { label: "Plus customers", value: data.plusCustomers },
            { label: "Pro customers", value: data.proCustomers },
            { label: "Max customers", value: data.maxCustomers },
            { label: "Scans this month", value: data.totalScansThisMonth },
            { label: "Open fix requests", value: data.fixRequestsOpen, tone: data.fixRequestsOpen ? "text-amber-700" : "text-ink" },
            { label: "Resolved fix requests", value: data.fixRequestsResolved },
            { label: "Organizations near limit", value: data.organizationsNearScanLimit, tone: data.organizationsNearScanLimit ? "text-amber-700" : "text-ink" },
            { label: "ZAP scans today", value: data.zapScansToday },
            { label: "ZAP baseline scans", value: data.zapBaselineScans },
            { label: "ZAP full scans", value: data.zapFullScans },
            { label: "Failed ZAP scans", value: data.failedZapScans, tone: data.failedZapScans ? "text-red-700" : "text-ink" },
            { label: "Avg ZAP duration", value: `${data.averageZapScanDurationSeconds}s` },
            { label: "Nuclei scans today", value: data.nucleiScansToday },
            { label: "Nuclei safe scans", value: data.nucleiSafeBaselineScans },
            { label: "Nuclei CVE scans", value: data.nucleiCveScans },
            { label: "Nuclei full scans", value: data.nucleiFullScans },
            { label: "Failed Nuclei scans", value: data.failedNucleiScans, tone: data.failedNucleiScans ? "text-red-700" : "text-ink" },
            { label: "Avg Nuclei duration", value: `${data.averageNucleiScanDurationSeconds}s` },
            { label: "SQL injection scans today", value: data.sqlmapScansToday },
            { label: "SQL injection findings", value: data.sqlmapFindings },
            { label: "Failed sqlmap scans", value: data.failedSqlmapScans, tone: data.failedSqlmapScans ? "text-red-700" : "text-ink" },
            { label: "Avg sqlmap duration", value: `${data.averageSqlmapScanDurationSeconds}s` },
          ]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminList title="Reports by type" href="/admin/reports">
              {data.reportsByType.map((report) => <Row key={report.reportType} title={report.reportType.replaceAll("_", " ")} meta={`${report.count} generated`} date={new Date().toISOString()} />)}
            </AdminList>
            <AdminList title="Most reported assets" href="/admin/reports">
              {data.mostReportedAssets.map((asset, index) => <Row key={asset.id ?? index} title={asset.name ?? "Unknown asset"} meta={`${asset.count} reports - ${asset.url ?? "URL unavailable"}`} date={new Date().toISOString()} />)}
            </AdminList>
            <AdminList title="Recent users" href="/admin/users">
              {data.recentUsers.map((user) => (
                <Row key={user.id} title={user.name} meta={`${user.email} - ${user.role} - ${user.isActive ? "Active" : "Inactive"}`} date={user.createdAt} />
              ))}
            </AdminList>
            <AdminList title="Recent scans" href="/admin/scans">
              {data.recentScans.map((scan) => (
                <Row key={scan.id} title={scan.asset.name} meta={`${scan.status} - ${scan.scanType} - ${scan.creator.email}`} date={scan.createdAt} />
              ))}
            </AdminList>
            <AdminList title="Failed scans" href="/admin/scans">
              {data.failedScanRows.map((scan) => (
                <Row key={scan.id} title={scan.asset.name} meta={scan.jobs[0]?.errorMessage ?? "Retry available from scan administration."} date={scan.createdAt} />
              ))}
              {!data.failedScanRows.length ? <p className="text-sm text-slate-600">No failed scans.</p> : null}
            </AdminList>
            <AdminList title="Recent audit logs" href="/admin/audit-logs">
              {data.recentAuditLogs.map((log) => (
                <Row key={log.id} title={log.action} meta={`${log.entityType} - ${log.user?.email ?? "System"} - ${log.organization.name}`} date={log.createdAt} />
              ))}
            </AdminList>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Recent customer logins</h2>
                  <p className="mt-1 text-sm text-slate-600">Latest users who signed into the customer or admin workspace.</p>
                </div>
                <Link className="text-sm font-medium text-signal" href="/admin/users">View all users</Link>
              </div>
              <div className="mt-4 space-y-3">
                {data.recentLogins.map((login) => (
                  <div key={login.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{login.user?.name ?? "Deleted user"}</p>
                        <p className="text-xs text-slate-500">{login.user?.email ?? "No email"} - {login.organization.name}</p>
                      </div>
                      <p className="text-xs text-slate-500"><DateText value={login.loggedInAt} /></p>
                    </div>
                  </div>
                ))}
                {!data.recentLogins.length ? <p className="text-sm text-slate-600">No login activity yet.</p> : null}
              </div>
            </Card>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Queue status</h2>
                  <p className="mt-1 text-sm text-slate-600">Current BullMQ counts reported by the API.</p>
                </div>
                <Button onClick={() => downloadApiFile("/admin/usage-report", "luminar-admin-usage-report.json")}>Export usage report</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(data.queue).map(([key, value]) => <StateBadge key={key} value={`${key.toUpperCase()} ${value}`} />)}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function AdminList({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <Link className="text-sm font-medium text-signal" href={href}>View all</Link>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </Card>
  );
}

function Row({ title, meta, date }: { title: string; meta: string; date: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="text-xs text-slate-500">{meta}</p>
        </div>
        <p className="text-xs text-slate-500"><DateText value={date} /></p>
      </div>
    </div>
  );
}
