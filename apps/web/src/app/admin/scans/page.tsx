"use client";

import Link from "next/link";
import { Button, Card, ErrorState, Skeleton } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatEnum } from "../../../lib/security-ui";
import { AdminShell, AdminTable, DateText, StateBadge, Td, Th, useAdminData } from "../admin-components";

type Scan = {
  id: string;
  scanType: string;
  status: string;
  createdAt: string;
  securityScore?: string | number | null;
  asset: { id: string; name: string; url: string; project: { organization: { id: string; name: string; slug: string } } };
  creator: { name: string; email: string };
  jobs: Array<{ id: string; jobType: string; status: string; errorMessage?: string | null }>;
  _count: { findings: number };
};

export default function AdminScansPage() {
  const { data, error, loading, reload } = useAdminData<Scan[]>("/admin/scans");

  async function retry(scanId: string) {
    if (!window.confirm("Retry this failed scan?")) return;
    await apiRequest(`/admin/scans/${scanId}/retry`, { method: "POST" });
    reload();
  }

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Scans</h2>
        <p className="mt-1 text-sm text-slate-600">Monitor scan execution, failed jobs, queue retries, and tenant ownership.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[1120px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>Scan</Th><Th>Status</Th><Th>Organization</Th><Th>Asset</Th><Th>Findings</Th><Th>Failed jobs</Th><Th>Created</Th><Th>Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((scan) => {
                const failedJobs = scan.jobs.filter((job) => job.status === "FAILED");
                return (
                  <tr key={scan.id}>
                    <Td><Link className="font-semibold text-ink hover:text-signal" href={`/scans/${scan.id}`}>{formatEnum(scan.scanType)}</Link><p className="text-xs text-slate-500">Score {scan.securityScore ?? "N/A"}</p></Td>
                    <Td><StateBadge value={scan.status} /></Td>
                    <Td>{scan.asset.project.organization.name}<p className="text-xs text-slate-500">{scan.asset.project.organization.slug}</p></Td>
                    <Td>{scan.asset.name}<p className="text-xs text-slate-500">{scan.asset.url}</p></Td>
                    <Td>{scan._count.findings}</Td>
                    <Td>{failedJobs.length ? failedJobs.map((job) => <p key={job.id} className="text-red-700">{formatEnum(job.jobType)}: {job.errorMessage ?? "Failed"}</p>) : "None"}</Td>
                    <Td><DateText value={scan.createdAt} /></Td>
                    <Td><Button className="h-8 bg-white px-3 text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={scan.status !== "FAILED"} onClick={() => retry(scan.id)}>Retry</Button></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
