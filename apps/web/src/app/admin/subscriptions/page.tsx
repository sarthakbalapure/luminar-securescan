"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, ErrorState, Select, Skeleton } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { planDisplayName } from "../../../lib/subscriptions";
import { AdminShell, AdminTable, BoolBadge, DateText, Td, Th, useAdminData } from "../admin-components";

type PlanCode = "PLUS" | "PRO" | "MAX";

type Subscription = {
  id: string;
  organizationId: string;
  planCode: PlanCode;
  planName: string;
  monthlyScanLimit: number;
  monthlyFixRequestLimit: number;
  dailyScanEnabled: boolean;
  reportLevel: "BASIC" | "DETAILED";
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    subscriptionUsages: Array<{ scansUsed: number; fixRequestsUsed: number; monthKey: string }>;
  };
};

export default function AdminSubscriptionsPage() {
  const { data, error, loading, reload } = useAdminData<Subscription[]>("/admin/subscriptions");
  const [savingOrg, setSavingOrg] = useState("");
  const [selectedPlans, setSelectedPlans] = useState<Record<string, PlanCode>>({});
  const [actionError, setActionError] = useState("");

  async function assignPlan(subscription: Subscription) {
    const planCode = selectedPlans[subscription.organizationId] ?? subscription.planCode;
    setSavingOrg(subscription.organizationId);
    setActionError("");
    try {
      await apiRequest(`/admin/organizations/${subscription.organizationId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({ planCode }),
      });
      reload();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "The plan could not be assigned.");
    } finally {
      setSavingOrg("");
    }
  }

  async function resetUsage(subscription: Subscription) {
    if (!window.confirm(`Reset this month's usage for ${subscription.organization.name}?`)) return;
    setSavingOrg(subscription.organizationId);
    setActionError("");
    try {
      await apiRequest(`/admin/organizations/${subscription.organizationId}/subscription/usage/reset`, { method: "POST" });
      reload();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Usage could not be reset.");
    } finally {
      setSavingOrg("");
    }
  }

  const activeSubscriptions = data?.filter((subscription) => subscription.isActive) ?? [];

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-600">Assign customer plans and review current-month usage.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {actionError ? <ErrorState message={actionError} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <AdminTable>
          <table className="w-full min-w-[1080px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><Th>Organization</Th><Th>Plan</Th><Th>Scan usage</Th><Th>Fix requests</Th><Th>Features</Th><Th>Valid until</Th><Th>Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeSubscriptions.map((subscription) => {
                const usage = subscription.organization.subscriptionUsages[0];
                const busy = savingOrg === subscription.organizationId;
                return (
                  <tr key={subscription.id}>
                    <Td><p className="font-medium text-ink">{subscription.organization.name}</p><p className="text-xs text-slate-500">{subscription.organization.slug}</p><div className="mt-2"><BoolBadge active={subscription.organization.isActive} /></div></Td>
                    <Td>
                      <Select aria-label={`Plan for ${subscription.organization.name}`} value={selectedPlans[subscription.organizationId] ?? subscription.planCode} onChange={(event) => setSelectedPlans({ ...selectedPlans, [subscription.organizationId]: event.target.value as PlanCode })}>
                        <option value="PLUS">Plus</option><option value="PRO">Pro</option><option value="MAX">Max</option>
                      </Select>
                      <p className="mt-1 text-xs text-slate-500">Current: {planDisplayName(subscription.planCode)}</p>
                    </Td>
                    <Td><span className="font-medium text-ink">{usage?.scansUsed ?? 0}</span> / {subscription.monthlyScanLimit}<p className="text-xs text-slate-500">{usage?.monthKey ?? "Current month"}</p></Td>
                    <Td><span className="font-medium text-ink">{usage?.fixRequestsUsed ?? 0}</span> / {subscription.monthlyFixRequestLimit}</Td>
                    <Td>{subscription.reportLevel === "DETAILED" ? "Detailed reports" : "Basic reports"}<p className="text-xs text-slate-500">Daily scan: {subscription.dailyScanEnabled ? "Enabled" : "Not available"}</p></Td>
                    <Td><DateText value={subscription.validTo} /></Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button className="h-8 px-3" disabled={busy} onClick={() => assignPlan(subscription)}>{busy ? "Saving..." : "Assign"}</Button>
                        <Button className="h-8 bg-white px-3 text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={busy} onClick={() => resetUsage(subscription)}>Reset usage</Button>
                        <Link className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-signal ring-1 ring-slate-200" href={`/admin/organizations/${subscription.organizationId}/subscription`}>Manage</Link>
                      </div>
                    </Td>
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
