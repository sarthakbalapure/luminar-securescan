"use client";

import { Card, ErrorState, Skeleton } from "../../../components/ui";
import { AdminShell, StateBadge, useAdminData } from "../admin-components";

type Health = {
  api: { status: string };
  database: { status: string; error?: string };
  queue: { status: string; waiting?: number; active?: number; failed?: number; delayed?: number; completed?: number; error?: string };
  worker: { status: string; runningScans: number; failedJobs: number };
  checkedAt: string;
};

export default function AdminSystemHealthPage() {
  const { data, error, loading } = useAdminData<Health>("/admin/system-health");

  return (
    <AdminShell>
      <Card>
        <h2 className="text-xl font-semibold text-ink">System health</h2>
        <p className="mt-1 text-sm text-slate-600">Operational status for API, database, queue, and worker signals.</p>
      </Card>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}
      {data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <HealthCard title="API" status={data.api.status} detail="HTTP service is responding." />
          <HealthCard title="Database" status={data.database.status} detail={data.database.error ?? "PostgreSQL connectivity check passed."} />
          <HealthCard title="Queue" status={data.queue.status} detail={`Waiting ${data.queue.waiting ?? 0}, active ${data.queue.active ?? 0}, failed ${data.queue.failed ?? 0}, delayed ${data.queue.delayed ?? 0}.`} />
          <HealthCard title="Worker" status={data.worker.status} detail={`${data.worker.runningScans} running scans, ${data.worker.failedJobs} failed scan jobs.`} />
        </div>
      ) : null}
    </AdminShell>
  );
}

function HealthCard({ title, status, detail }: { title: string; status: string; detail: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <StateBadge value={status} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}
