"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Card, ErrorState, SeverityBadge, Skeleton, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Finding = { id: string; title: string; severity: string; status: string; category: string; evidenceSummary: string; source?: string };

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Finding[]>("/findings")
      .then(setFindings)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Findings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <h1 className="text-3xl font-semibold text-ink">Findings</h1>
      {error ? <ErrorState message={error} /> : null}
      {loading ? <Skeleton className="mt-5 h-40" /> : null}
      <div className="mt-5 space-y-3">
        {findings.map((finding) => (
          <Card key={finding.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{finding.title}</h2>
              <p className="text-sm text-slate-600">{finding.category} - {finding.evidenceSummary}</p>
              <p className="mt-1 text-xs font-semibold uppercase text-slate-500">Source: {finding.source === "owasp_zap" ? "OWASP ZAP" : finding.source === "nuclei" ? "Nuclei" : finding.source === "sqlmap" ? "sqlmap" : "Internal"}</p>
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <StatusBadge status={finding.status} />
              <Link className="text-sm font-medium text-signal" href={`/findings/${finding.id}`}>Open</Link>
            </div>
          </Card>
        ))}
        {!loading && !findings.length ? <Card className="text-sm text-slate-600">No findings yet.</Card> : null}
      </div>
    </ProtectedShell>
  );
}
