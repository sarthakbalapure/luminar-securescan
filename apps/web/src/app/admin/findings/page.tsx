"use client";

import Link from "next/link";
import { Card, ErrorState, SeverityBadge, Skeleton } from "../../../components/ui";
import { AdminShell, AdminTable, DateText, StateBadge, Td, Th, useAdminData } from "../admin-components";

type Finding = {
  id: string;
  title: string;
  severity: string;
  status: string;
  category: string;
  evidenceSummary: string;
  lastDetectedAt: string;
  asset: { name: string; url: string; project: { organization: { name: string } } };
  scan: { id: string; scanType: string; status: string };
};

export default function AdminFindingsPage() {
  const { data, error, loading } = useAdminData<Finding[]>("/admin/findings");

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Findings</h2>
        <p className="mt-1 text-sm text-slate-600">Cross-tenant finding overview for platform monitoring. Evidence summaries should remain redacted.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[1060px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>Severity</Th><Th>Finding</Th><Th>Status</Th><Th>Organization</Th><Th>Asset</Th><Th>Detected</Th><Th>Scan</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((finding) => (
                <tr key={finding.id}>
                  <Td><SeverityBadge severity={finding.severity} /></Td>
                  <Td><Link className="font-semibold text-ink hover:text-signal" href={`/findings/${finding.id}`}>{finding.title}</Link><p className="line-clamp-2 text-xs text-slate-500">{finding.evidenceSummary}</p></Td>
                  <Td><StateBadge value={finding.status} /></Td>
                  <Td>{finding.asset.project.organization.name}</Td>
                  <Td>{finding.asset.name}<p className="text-xs text-slate-500">{finding.asset.url}</p></Td>
                  <Td><DateText value={finding.lastDetectedAt} /></Td>
                  <Td><Link className="text-signal" href={`/scans/${finding.scan.id}`}>{finding.scan.id.slice(0, 8)}</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
