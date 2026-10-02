"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../components/protected-shell";
import { Card, EmptyState, ErrorState, SeverityBadge, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Finding = {
  id: string;
  title: string;
  severity: string;
  status: string;
  category: string;
  evidenceSummary: string;
  lastDetectedAt: string;
};

export default function RepositoryFindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Finding[]>("/findings")
      .then((items) => setFindings(items.filter((finding) => finding.category === "Repository Security")))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Repository findings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Repository findings</h1>
          <p className="mt-2 text-sm text-slate-600">Redacted source-code, dependency, container, and CI/CD security findings.</p>
        </div>
        <Link className="text-sm font-medium text-signal" href="/assets/new">Add repository asset</Link>
      </div>

      {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
      {loading ? <p className="mt-5 text-sm text-slate-600">Loading repository findings...</p> : null}

      <div className="mt-5 space-y-3">
        {findings.map((finding) => (
          <Card key={finding.id} className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={finding.severity} />
                <StatusBadge status={finding.status} />
              </div>
              <h2 className="mt-3 font-semibold text-ink">{finding.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{finding.evidenceSummary}</p>
            </div>
            <Link className="text-sm font-medium text-signal" href={`/findings/${finding.id}`}>Open finding</Link>
          </Card>
        ))}
        {!loading && !findings.length && !error ? (
          <EmptyState title="No repository findings yet" detail="Run a repository scan to review redacted code, dependency, Dockerfile, and CI/CD observations." />
        ) : null}
      </div>
    </ProtectedShell>
  );
}
