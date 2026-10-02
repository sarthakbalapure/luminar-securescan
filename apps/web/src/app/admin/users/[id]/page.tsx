"use client";

import { useParams } from "next/navigation";
import { Card, ErrorState, Skeleton } from "../../../../components/ui";
import { formatEnum } from "../../../../lib/security-ui";
import { AdminShell, BoolBadge, DateText, StateBadge, useAdminData } from "../../admin-components";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  registeredAt: string;
  organizationMembers: Array<{ role: string; organization: { id: string; name: string; slug: string } }>;
  createdScans: Array<{ id: string; scanType: string; status: string; createdAt: string; asset: { name: string; url: string } }>;
  auditLogs: Array<{ id: string; action: string; createdAt: string; organization: { id: string; name: string; slug: string } }>;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useAdminData<UserDetail>(`/admin/users/${params.id}`);

  return (
    <AdminShell>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{data.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{data.email} - {formatEnum(data.role)}</p>
                <p className="mt-1 text-xs text-slate-500">Created <DateText value={data.createdAt} /></p>
                <p className="mt-1 text-xs text-slate-500">Last login {data.lastLoginAt ? <DateText value={data.lastLoginAt} /> : "never"}</p>
              </div>
              <BoolBadge active={data.isActive} />
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink">Customer activity</h3>
            <div className="mt-3 space-y-2">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{formatEnum(log.action)}</p>
                    <p className="text-xs text-slate-500">{log.organization.name}</p>
                  </div>
                  <StateBadge value={log.action.includes("LOGIN") ? "COMPLETED" : "INFO"} />
                  <p className="text-xs text-slate-500"><DateText value={log.createdAt} /></p>
                </div>
              ))}
              {!data.auditLogs.length ? <p className="text-sm text-slate-600">No login or registration activity yet.</p> : null}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink">Memberships</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {data.organizationMembers.map((member) => (
                <div key={member.organization.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-ink">{member.organization.name}</p>
                  <p className="text-xs text-slate-500">{member.organization.slug} - {formatEnum(member.role)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink">Recent scans</h3>
            <div className="mt-3 space-y-2">
              {data.createdScans.map((scan) => (
                <div key={scan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                  <div><p className="font-medium text-ink">{scan.asset.name}</p><p className="text-slate-600">{scan.asset.url}</p></div>
                  <StateBadge value={scan.status} />
                </div>
              ))}
              {!data.createdScans.length ? <p className="text-sm text-slate-600">No recent scans.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}
