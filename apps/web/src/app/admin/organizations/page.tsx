"use client";

import Link from "next/link";
import { Button, Card, ErrorState, Skeleton } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { AdminShell, AdminTable, BoolBadge, DateText, Td, Th, useAdminData } from "../admin-components";

type Organization = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string };
  subscriptionPlans: Array<{ planName: string; scanLimit: number; assetLimit: number }>;
  _count: { members: number; projects: number; auditLogs: number };
};

export default function AdminOrganizationsPage() {
  const { data, error, loading, reload } = useAdminData<Organization[]>("/admin/organizations");

  async function disableOrganization(id: string) {
    if (!window.confirm("Disable this organization? Users will no longer be treated as active for admin review.")) return;
    await apiRequest(`/admin/organizations/${id}/disable`, {
      method: "POST",
      body: JSON.stringify({ reason: "Disabled from admin panel" }),
    });
    reload();
  }

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Organizations</h2>
        <p className="mt-1 text-sm text-slate-600">Inspect tenants, active plans, owners, and workspace activity.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>Name</Th><Th>Status</Th><Th>Owner</Th><Th>Plan</Th><Th>Usage</Th><Th>Created</Th><Th>Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((organization) => (
                <tr key={organization.id}>
                  <Td><Link className="font-semibold text-ink hover:text-signal" href={`/admin/organizations/${organization.id}`}>{organization.name}</Link><p className="text-xs text-slate-500">{organization.slug}</p></Td>
                  <Td><BoolBadge active={organization.isActive} /></Td>
                  <Td>{organization.owner.name}<p className="text-xs text-slate-500">{organization.owner.email}</p></Td>
                  <Td>{organization.subscriptionPlans[0]?.planName ?? "Unassigned"}<p className="text-xs text-slate-500">{organization.subscriptionPlans[0]?.assetLimit ?? 0} assets / {organization.subscriptionPlans[0]?.scanLimit ?? 0} scans</p></Td>
                  <Td>{organization._count.projects} projects<p className="text-xs text-slate-500">{organization._count.members} members</p></Td>
                  <Td><DateText value={organization.createdAt} /></Td>
                  <Td><Button className="h-8 bg-white px-3 text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={!organization.isActive} onClick={() => disableOrganization(organization.id)}>Disable</Button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
