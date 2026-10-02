"use client";

import Link from "next/link";
import { Badge, Card, ErrorState, Skeleton } from "../../../components/ui";
import { formatEnum } from "../../../lib/security-ui";
import { AdminShell, AdminTable, BoolBadge, DateText, Td, Th, useAdminData } from "../admin-components";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  isNewUser: boolean;
  organizationMembers: Array<{ role: string; organization: { name: string; slug: string } }>;
  _count: { createdScans: number; auditLogs: number };
};

export default function AdminUsersPage() {
  const { data, error, loading } = useAdminData<User[]>("/admin/users");

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Users</h2>
        <p className="mt-1 text-sm text-slate-600">User accounts, roles, memberships, scan counts, and audit activity. Passwords are never displayed.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>User</Th><Th>Status</Th><Th>Role</Th><Th>Organizations</Th><Th>Usage</Th><Th>Last login</Th><Th>Created</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((user) => (
                <tr key={user.id}>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="font-semibold text-ink hover:text-signal" href={`/admin/users/${user.id}`}>{user.name}</Link>
                      {user.isNewUser ? <Badge tone="bg-signal/10 text-signal ring-signal/20">New</Badge> : null}
                    </div>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </Td>
                  <Td><BoolBadge active={user.isActive} /></Td>
                  <Td>{formatEnum(user.role)}</Td>
                  <Td>{user.organizationMembers.map((member) => `${member.organization.name} (${formatEnum(member.role)})`).join(", ") || "None"}</Td>
                  <Td>{user._count.createdScans} scans<p className="text-xs text-slate-500">{user._count.auditLogs} audit events</p></Td>
                  <Td>{user.lastLoginAt ? <DateText value={user.lastLoginAt} /> : <span className="text-slate-400">Never</span>}</Td>
                  <Td><DateText value={user.createdAt} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      ) : null}
    </AdminShell>
  );
}
