"use client";

import { useParams } from "next/navigation";
import { Card, ErrorState, Skeleton } from "../../../../components/ui";
import { formatEnum } from "../../../../lib/security-ui";
import { AdminShell, AdminTable, BoolBadge, DateText, Td, Th, useAdminData } from "../../admin-components";

type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string; role: string };
  members: Array<{ role: string; user: { id: string; name: string; email: string; role: string; isActive: boolean } }>;
  projects: Array<{ id: string; name: string; assets: Array<{ id: string; type: string; name: string; url: string; riskLevel: string; verifiedStatus: string }> }>;
  subscriptionPlans: Array<{ id: string; planName: string; scanLimit: number; assetLimit: number; isActive: boolean; validFrom: string; validTo?: string | null }>;
};

export default function AdminOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useAdminData<OrganizationDetail>(`/admin/organizations/${params.id}`);

  return (
    <AdminShell>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-72" /> : null}
      {data ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{data.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{data.slug} - owner {data.owner.email}</p>
              </div>
              <BoolBadge active={data.isActive} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-ink">Members</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {data.members.map((member) => (
                <div key={member.user.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-ink">{member.user.name}</p>
                  <p className="text-slate-600">{member.user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatEnum(member.role)} - {formatEnum(member.user.role)}</p>
                </div>
              ))}
            </div>
          </Card>

          <AdminTable>
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr><Th>Project</Th><Th>Asset</Th><Th>Type</Th><Th>URL</Th><Th>Risk</Th><Th>Verification</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.projects.flatMap((project) => project.assets.length ? project.assets.map((asset) => (
                  <tr key={asset.id}>
                    <Td>{project.name}</Td>
                    <Td>{asset.name}</Td>
                    <Td>{formatEnum(asset.type)}</Td>
                    <Td>{asset.url}</Td>
                    <Td>{formatEnum(asset.riskLevel)}</Td>
                    <Td>{formatEnum(asset.verifiedStatus)}</Td>
                  </tr>
                )) : [(
                  <tr key={project.id}>
                    <Td>{project.name}</Td><Td>No assets</Td><Td>N/A</Td><Td>N/A</Td><Td>N/A</Td><Td>N/A</Td>
                  </tr>
                )])}
              </tbody>
            </table>
          </AdminTable>

          <Card>
            <h3 className="font-semibold text-ink">Subscription history</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {data.subscriptionPlans.map((plan) => (
                <div key={plan.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-ink">{plan.planName}</p>
                  <p className="text-slate-600">{plan.assetLimit} assets / {plan.scanLimit} scans</p>
                  <p className="text-xs text-slate-500">From <DateText value={plan.validFrom} /></p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}
