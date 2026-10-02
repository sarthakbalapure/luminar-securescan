"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "../../../admin-components";
import { Button, Card, ErrorState, Input, Select, Skeleton } from "../../../../../components/ui";
import { apiRequest } from "../../../../../lib/api";
import { planDisplayName } from "../../../../../lib/subscriptions";

type PlanCode = "PLUS" | "PRO" | "MAX";
type Subscription = {
  id: string;
  organizationId: string;
  planCode: PlanCode;
  monthlyScanLimit: number;
  monthlyFixRequestLimit: number;
  reportLevel: "BASIC" | "DETAILED";
  dailyScanEnabled: boolean;
  validFrom: string;
  validTo?: string | null;
  notes?: string | null;
  isActive: boolean;
  organization: { id: string; name: string; slug: string; subscriptionUsages: Array<{ scansUsed: number; fixRequestsUsed: number; monthKey: string }> };
};

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function OrganizationSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [planCode, setPlanCode] = useState<PlanCode>("PLUS");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Subscription[]>("/admin/subscriptions")
      .then((rows) => {
        const current = rows.find((row) => row.organizationId === params.id && row.isActive);
        if (!current) throw new Error("No active subscription was found for this organization.");
        setSubscription(current);
        setPlanCode(current.planCode);
        setValidFrom(dateInputValue(current.validFrom));
        setValidTo(dateInputValue(current.validTo));
        setNotes(current.notes ?? "");
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Subscription could not be loaded."))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/admin/organizations/${params.id}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({
          planCode,
          ...(validFrom ? { validFrom: new Date(`${validFrom}T00:00:00.000Z`).toISOString() } : {}),
          ...(validTo ? { validTo: new Date(`${validTo}T23:59:59.999Z`).toISOString() } : {}),
          notes,
        }),
      });
      router.push("/admin/subscriptions");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The subscription could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const usage = subscription?.organization.subscriptionUsages[0];

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm font-medium text-signal">Subscription management</p><h2 className="text-2xl font-semibold text-ink">{subscription?.organization.name ?? "Organization"}</h2></div>
        <Link className="text-sm font-medium text-signal" href="/admin/subscriptions">Back to subscriptions</Link>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-80" /> : null}
      {subscription ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="planCode">Plan</label>
                <Select id="planCode" className="mt-1" value={planCode} onChange={(event) => setPlanCode(event.target.value as PlanCode)}>
                  <option value="PLUS">Plus - 3 scans, basic reports</option>
                  <option value="PRO">Pro - 10 scans, detailed reports</option>
                  <option value="MAX">Max - 30 scans, detailed reports and 10 fix requests</option>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="text-sm font-medium text-slate-700" htmlFor="validFrom">Valid from</label><Input id="validFrom" className="mt-1" type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} /></div>
                <div><label className="text-sm font-medium text-slate-700" htmlFor="validTo">Valid until</label><Input id="validTo" className="mt-1" type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} /></div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="notes">Admin notes</label>
                <textarea id="notes" className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <Button disabled={saving} type="submit">{saving ? "Saving..." : "Assign plan"}</Button>
            </form>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink">Current subscription</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-slate-500">Plan</dt><dd className="font-medium text-ink">{planDisplayName(subscription.planCode)}</dd></div>
              <div><dt className="text-slate-500">Scans this month</dt><dd className="font-medium text-ink">{usage?.scansUsed ?? 0} / {subscription.monthlyScanLimit}</dd></div>
              <div><dt className="text-slate-500">Fix requests this month</dt><dd className="font-medium text-ink">{usage?.fixRequestsUsed ?? 0} / {subscription.monthlyFixRequestLimit}</dd></div>
              <div><dt className="text-slate-500">Report level</dt><dd className="font-medium text-ink">{subscription.reportLevel === "DETAILED" ? "Detailed" : "Basic"}</dd></div>
              <div><dt className="text-slate-500">Daily scan</dt><dd className="font-medium text-ink">{subscription.dailyScanEnabled ? "Enabled" : "Not available"}</dd></div>
            </dl>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}
