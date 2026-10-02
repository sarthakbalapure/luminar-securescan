"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Badge, Card, ErrorState, Skeleton } from "../../components/ui";
import { apiRequest, type ApiUser } from "../../lib/api";
import { isAdminRole } from "../../lib/roles";
import { formatDate, formatEnum, statusTone } from "../../lib/security-ui";

const adminLinks = [
  ["Admin Dashboard", "/admin/dashboard"],
  ["Organizations", "/admin/organizations"],
  ["Users", "/admin/users"],
  ["Scans", "/admin/scans"],
  ["Findings", "/admin/findings"],
  ["Reports", "/admin/reports"],
  ["Fix requests", "/admin/fix-requests"],
  ["Audit logs", "/admin/audit-logs"],
  ["System health", "/admin/system-health"],
  ["Subscriptions", "/admin/subscriptions"],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ApiUser>("/auth/me")
      .then(setUser)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Admin access could not be verified."));
  }, []);

  return (
    <ProtectedShell>
      {error ? <ErrorState message={error} /> : null}
      {user && !isAdminRole(user.role) ? (
        <ErrorState message="Access denied. You do not have permission to access this page." />
      ) : null}
      {!user && !error ? <Skeleton className="h-28" /> : null}
      {isAdminRole(user?.role) ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-signal">Platform administration</p>
              <h1 className="text-3xl font-semibold text-ink">LuminarIQ SecureScan Admin</h1>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {adminLinks.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-signal hover:text-signal">
                {label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      ) : null}
    </ProtectedShell>
  );
}

export function StatGrid({ items }: { items: Array<{ label: string; value: string | number; tone?: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <p className="text-sm text-slate-600">{item.label}</p>
          <p className={`mt-2 text-3xl font-semibold ${item.tone ?? "text-ink"}`}>{item.value}</p>
        </Card>
      ))}
    </div>
  );
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>;
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{children}</th>;
}

export function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-sm text-slate-700">{children}</td>;
}

export function StateBadge({ value }: { value: string }) {
  return <Badge tone={statusTone(value)}>{formatEnum(value)}</Badge>;
}

export function BoolBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}>{active ? "Active" : "Disabled"}</Badge>;
}

export function DateText({ value }: { value?: string | null }) {
  return <span>{formatDate(value)}</span>;
}

export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError("");
    apiRequest<T>(path)
      .then(setData)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Admin data could not be loaded."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [path]);

  return { data, error, loading, reload: load };
}
