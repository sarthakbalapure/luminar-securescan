"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Card } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Scan = { id: string; status: string; createdAt: string; completedAt?: string | null; securityScore?: string | number | null; asset: { name: string; url: string }; _count?: { findings: number } };

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Scan[]>("/scans").then(setScans).finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <h1 className="text-3xl font-semibold text-ink">Scan history</h1>
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading scans...</p> : null}
      <div className="mt-5 space-y-3">
        {scans.map((scan) => (
          <Card key={scan.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{scan.asset.name}</h2>
              <p className="text-sm text-slate-600">{scan.status} · {scan._count?.findings ?? 0} findings · score {scan.securityScore ?? "N/A"}</p>
            </div>
            <Link className="text-sm font-medium text-signal" href={scan.status === "QUEUED" || scan.status === "RUNNING" ? `/scans/${scan.id}/progress` : `/scans/${scan.id}`}>
              Open
            </Link>
          </Card>
        ))}
        {!loading && !scans.length ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>No scans have been queued yet.</span>
            <Link className="rounded-md bg-signal px-3 py-2 font-medium text-white" href="/assets">Choose a website to scan</Link>
          </Card>
        ) : null}
      </div>
    </ProtectedShell>
  );
}
