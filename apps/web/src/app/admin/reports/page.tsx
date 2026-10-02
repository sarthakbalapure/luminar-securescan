"use client";

import Link from "next/link";
import { AdminShell, AdminTable, DateText, StateBadge, Td, Th, useAdminData } from "../admin-components";
import { Button, ErrorState, Skeleton } from "../../../components/ui";
import { downloadApiFile } from "../../../lib/api";

type Report = {
  id: string;
  reportType: string;
  reportStatus: string;
  title?: string | null;
  fileUrl?: string | null;
  generatedAt: string;
  scan: {
    id: string;
    status: string;
    asset: { name: string; url: string; project: { organization: { name: string } } };
  };
};

export default function AdminReportsPage() {
  const { data, error, loading } = useAdminData<Report[]>("/admin/reports");

  return (
    <AdminShell>
      <div>
        <h2 className="text-2xl font-semibold text-ink">Reports</h2>
        <p className="mt-1 text-sm text-slate-600">Platform-wide generated report inventory.</p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-56" /> : null}
      {data ? (
        <AdminTable>
          <table className="min-w-full divide-y divide-slate-200">
            <thead><tr><Th>Report</Th><Th>Asset</Th><Th>Organization</Th><Th>Status</Th><Th>Generated</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((report) => (
                <tr key={report.id}>
                  <Td>{report.title ?? report.reportType}</Td>
                  <Td>{report.scan.asset.name}<br /><span className="text-xs text-slate-500">{report.scan.asset.url}</span></Td>
                  <Td>{report.scan.asset.project.organization.name}</Td>
                  <Td><StateBadge value={report.reportStatus ?? report.scan.status} /></Td>
                  <Td><DateText value={report.generatedAt} /></Td>
                  <Td><div className="flex flex-wrap gap-2"><Link className="text-sm font-medium text-signal" href={`/admin/reports/${report.id}`}>Preview</Link><Button className="h-8 px-3" onClick={() => downloadApiFile(`/reports/${report.id}/download`, `luminar-report-${report.id}.pdf`)}>PDF</Button></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
