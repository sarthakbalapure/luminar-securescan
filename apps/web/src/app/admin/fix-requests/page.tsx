"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, ErrorState, Select, Skeleton } from "../../../components/ui";
import { formatDate } from "../../../lib/security-ui";
import { AdminShell, AdminTable, StateBadge, Td, Th, useAdminData } from "../admin-components";

type FixRequest = {
  id: string;
  subject: string;
  status: string;
  severity?: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  requester: { name: string; email: string };
  assignedAdmin?: { name: string } | null;
  finding?: { title: string } | null;
};

export default function AdminFixRequestsPage() {
  const { data, error, loading } = useAdminData<FixRequest[]>("/admin/fix-requests");
  const [status, setStatus] = useState("ALL");
  const [organizationId, setOrganizationId] = useState("ALL");
  const organizations = useMemo(() => Array.from(new Map((data ?? []).map((item) => [item.organization.id, item.organization])).values()), [data]);
  const requests = (data ?? []).filter((item) => (status === "ALL" || item.status === status) && (organizationId === "ALL" || item.organization.id === organizationId));

  return (
    <AdminShell>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-ink">Fix support requests</h2><p className="mt-1 text-sm text-slate-600">Review and respond to Max customer remediation requests.</p></div>
          <div className="flex gap-2"><Select className="w-52" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="ALL">All organizations</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select className="w-48" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{["OPEN", "IN_REVIEW", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].map((item) => <option key={item}>{item}</option>)}</Select></div>
        </div>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-72" /> : null}
      {!loading ? <AdminTable><table className="w-full min-w-[980px] text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr><Th>Request</Th><Th>Organization</Th><Th>Customer</Th><Th>Status</Th><Th>Assigned</Th><Th>Created</Th><Th>Action</Th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((request) => <tr key={request.id}><Td><p className="font-medium text-ink">{request.subject}</p><p className="text-xs text-slate-500">{request.finding?.title}</p></Td><Td>{request.organization.name}</Td><Td>{request.requester.name}<p className="text-xs text-slate-500">{request.requester.email}</p></Td><Td><StateBadge value={request.status} /></Td><Td>{request.assignedAdmin?.name ?? "Unassigned"}</Td><Td>{formatDate(request.createdAt)}</Td><Td><Link className="font-medium text-signal" href={`/admin/fix-requests/${request.id}`}>Review</Link></Td></tr>)}</tbody></table></AdminTable> : null}
    </AdminShell>
  );
}
