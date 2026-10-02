"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, ErrorState, Skeleton, StatusBadge } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/security-ui";

type FixRequest = {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminResponse?: string | null;
  customerResponse?: string | null;
  createdAt: string;
  updatedAt: string;
  finding?: { id: string; title: string; severity: string; remediationSummary: string } | null;
  asset?: { name: string; url: string } | null;
  assignedAdmin?: { name: string; email: string } | null;
};

export default function FixRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<FixRequest | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    apiRequest<FixRequest>(`/fix-requests/${params.id}`)
      .then(setRequest)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Fix support request could not be loaded."));
  }

  useEffect(load, [params.id]);

  async function sendReply() {
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest<FixRequest>(`/fix-requests/${params.id}/reply`, { method: "POST", body: JSON.stringify({ message: reply }) });
      setRequest(updated);
      setReply("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Reply could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      {error ? <ErrorState message={error} /> : null}
      {!request && !error ? <Skeleton className="h-96" /> : null}
      {request ? (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-signal">Fix support request</p><h1 className="mt-1 text-3xl font-semibold text-ink">{request.subject}</h1><p className="mt-2 text-sm text-slate-600">Created {formatDate(request.createdAt)}</p></div>
              <StatusBadge status={request.status} />
            </div>
          </Card>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <Card><h2 className="font-semibold text-ink">Your request</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{request.message}</p></Card>
              {request.adminResponse ? <Card><h2 className="font-semibold text-ink">Admin response</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{request.adminResponse}</p></Card> : <Card className="text-sm text-slate-600">An administrator has not responded yet.</Card>}
              {request.customerResponse ? <Card><h2 className="font-semibold text-ink">Latest customer reply</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{request.customerResponse}</p></Card> : null}
              {!['RESOLVED', 'CLOSED'].includes(request.status) ? <Card><h2 className="font-semibold text-ink">Reply</h2><textarea className="mt-3 min-h-32 w-full rounded-md border border-slate-300 p-3 text-sm" value={reply} maxLength={5000} onChange={(event) => setReply(event.target.value)} /><Button className="mt-3" disabled={saving || reply.trim().length < 2} onClick={sendReply}>{saving ? "Sending..." : "Send reply"}</Button></Card> : null}
            </div>
            <aside className="space-y-4">
              <Card><h2 className="font-semibold text-ink">Related security issue</h2><p className="mt-3 text-sm font-medium text-ink">{request.finding?.title ?? "Finding unavailable"}</p><p className="mt-1 text-sm text-slate-600">{request.asset?.url}</p>{request.finding ? <Link className="mt-3 inline-block text-sm font-medium text-signal" href={`/findings/${request.finding.id}`}>Open finding</Link> : null}</Card>
              <Card><h2 className="font-semibold text-ink">Assignment</h2><p className="mt-3 text-sm text-slate-600">{request.assignedAdmin ? `${request.assignedAdmin.name} (${request.assignedAdmin.email})` : "Waiting for admin assignment"}</p></Card>
            </aside>
          </div>
        </div>
      ) : null}
    </ProtectedShell>
  );
}
