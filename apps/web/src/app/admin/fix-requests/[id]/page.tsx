"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorState, Select, Skeleton, StatusBadge } from "../../../../components/ui";
import { apiRequest } from "../../../../lib/api";
import { formatDate } from "../../../../lib/security-ui";
import { AdminShell } from "../../admin-components";

type FixRequest = {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminResponse?: string | null;
  customerResponse?: string | null;
  createdAt: string;
  organization: { name: string };
  requester: { name: string; email: string };
  assignedAdmin?: { name: string; email: string } | null;
  asset?: { name: string; url: string } | null;
  finding?: { id: string; title: string; severity: string; category: string; remediationSummary: string } | null;
};

export default function AdminFixRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<FixRequest | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    apiRequest<FixRequest>(`/admin/fix-requests/${params.id}`).then((next) => { setRequest(next); setStatus(next.status); setResponse(next.adminResponse ?? ""); }).catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Request could not be loaded."));
  }
  useEffect(load, [params.id]);

  async function action(path: string, method: "POST" | "PATCH", body: object) {
    setSaving(true); setError("");
    try { const updated = await apiRequest<FixRequest>(path, { method, body: JSON.stringify(body) }); setRequest(updated); setStatus(updated.status); setResponse(updated.adminResponse ?? response); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Request could not be updated."); }
    finally { setSaving(false); }
  }

  return (
    <AdminShell>
      {error ? <ErrorState message={error} /> : null}
      {!request && !error ? <Skeleton className="h-96" /> : null}
      {request ? <div className="space-y-5">
        <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-signal">{request.organization.name}</p><h2 className="mt-1 text-2xl font-semibold text-ink">{request.subject}</h2><p className="mt-2 text-sm text-slate-600">{request.requester.name} - {request.requester.email} - {formatDate(request.createdAt)}</p></div><StatusBadge status={request.status} /></div></Card>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4"><Card><h3 className="font-semibold text-ink">Customer request</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{request.message}</p></Card>{request.customerResponse ? <Card><h3 className="font-semibold text-ink">Customer reply</h3><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{request.customerResponse}</p></Card> : null}<Card><h3 className="font-semibold text-ink">Admin response</h3><textarea className="mt-3 min-h-40 w-full rounded-md border border-slate-300 p-3 text-sm" value={response} maxLength={5000} onChange={(event) => setResponse(event.target.value)} /><Button className="mt-3" disabled={saving || response.trim().length < 2} onClick={() => action(`/admin/fix-requests/${request.id}/respond`, "POST", { message: response })}>{saving ? "Saving..." : "Send response"}</Button></Card></div>
          <aside className="space-y-4"><Card><h3 className="font-semibold text-ink">Workflow</h3><Button className="mt-3 w-full bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={saving} onClick={() => action(`/admin/fix-requests/${request.id}/assign`, "PATCH", {})}>Assign to me</Button><Select className="mt-3" value={status} onChange={(event) => setStatus(event.target.value)}>{["OPEN", "IN_REVIEW", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].map((item) => <option key={item}>{item}</option>)}</Select><Button className="mt-3 w-full" disabled={saving || status === request.status} onClick={() => action(`/admin/fix-requests/${request.id}/status`, "PATCH", { status })}>Update status</Button></Card><Card><h3 className="font-semibold text-ink">Related finding</h3><p className="mt-3 text-sm font-medium text-ink">{request.finding?.title ?? "Unavailable"}</p><p className="mt-1 text-sm text-slate-600">{request.asset?.url}</p>{request.finding ? <Link className="mt-3 inline-block text-sm font-medium text-signal" href="/admin/findings">Open admin findings</Link> : null}</Card></aside>
        </div>
      </div> : null}
    </AdminShell>
  );
}
