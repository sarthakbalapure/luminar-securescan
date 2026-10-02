"use client";

import { Card, ErrorState, Skeleton } from "../../../components/ui";
import { AdminShell, AdminTable, DateText, Td, Th, useAdminData } from "../admin-components";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
  organization: { name: string; slug: string };
  user?: { name: string; email: string; role: string } | null;
};

export default function AdminAuditLogsPage() {
  const { data, error, loading } = useAdminData<AuditLog[]>("/admin/audit-logs");

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Audit logs</h2>
        <p className="mt-1 text-sm text-slate-600">Review platform and tenant actions. Metadata must not contain plaintext secrets.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[1040px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>Time</Th><Th>Action</Th><Th>Organization</Th><Th>User</Th><Th>Entity</Th><Th>Metadata</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((log) => (
                <tr key={log.id}>
                  <Td><DateText value={log.createdAt} /></Td>
                  <Td>{log.action}</Td>
                  <Td>{log.organization.name}<p className="text-xs text-slate-500">{log.organization.slug}</p></Td>
                  <Td>{log.user?.name ?? "System"}<p className="text-xs text-slate-500">{log.user?.email ?? ""}</p></Td>
                  <Td>{log.entityType}<p className="text-xs text-slate-500">{log.entityId ?? "N/A"}</p></Td>
                  <Td><pre className="max-w-md overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
