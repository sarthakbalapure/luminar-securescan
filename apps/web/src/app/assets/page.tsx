"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Card, ErrorState, Skeleton, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Asset = { id: string; name: string; url: string; type: string; verifiedStatus: string; riskLevel: string };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Asset[]>("/assets")
      .then(setAssets)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Assets could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-ink">Assets</h1>
        <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href="/assets/new">Add asset</Link>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="mt-5 h-40" /> : null}
      <div className="mt-5 grid gap-3">
        {assets.map((asset) => (
          <Card key={asset.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{asset.name}</h2>
              <p className="text-sm text-slate-600">{asset.type} - {asset.url}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={asset.verifiedStatus} />
              <Link className="rounded-md bg-signal px-3 py-2 text-sm font-medium text-white" href={`/assets/${asset.id}`}>Start scan</Link>
            </div>
          </Card>
        ))}
        {!loading && !assets.length ? <Card className="text-sm text-slate-600">No assets registered yet.</Card> : null}
      </div>
    </ProtectedShell>
  );
}
