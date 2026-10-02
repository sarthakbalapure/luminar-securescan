"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { formatDate } from "../../lib/security-ui";

type FixRequest = {
  id: string;
  subject: string;
  status: string;
  severity?: string | null;
  createdAt: string;
  finding?: { id: string; title: string } | null;
  asset?: { name: string; url: string } | null;
  assignedAdmin?: { name: string } | null;
};

export default function FixRequestsPage() {
  const [requests, setRequests] = useState<FixRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<FixRequest[]>("/fix-requests")
      .then(setRequests)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Fix support requests could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-signal">Max plan support</p>
        <h1 className="text-3xl font-semibold text-ink">Fix support requests</h1>
        <p className="mt-1 text-sm text-slate-600">Track remediation questions and responses from the LuminarIQ admin team.</p>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {!loading && !requests.length ? <EmptyState title="No support requests" detail="Max plan users can request admin help from any finding detail page." /> : null}
      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/fix-requests/${request.id}`} className="font-semibold text-ink hover:text-signal">{request.subject}</Link>
                <p className="mt-1 text-sm text-slate-600">{request.asset?.name ?? "Asset"} · {request.finding?.title ?? "General remediation help"}</p>
                <p className="mt-2 text-xs text-slate-500">Created {formatDate(request.createdAt)}{request.assignedAdmin ? ` · Assigned to ${request.assignedAdmin.name}` : ""}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
          </Card>
        ))}
      </div>
    </ProtectedShell>
  );
}
