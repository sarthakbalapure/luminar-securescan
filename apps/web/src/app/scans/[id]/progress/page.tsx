"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../../../components/protected-shell";
import { Card } from "../../../../components/ui";
import { apiRequest } from "../../../../lib/api";
import { formatScanElapsed, isTerminalScanStatus } from "../../../../lib/scan-progress";

type Scan = {
  id: string;
  status: string;
  scanMode?: string;
  scanner?: string;
  targetUrl?: string | null;
  testedParameter?: string | null;
  httpMethod?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  securityScore?: string | number | null;
  asset: { name: string; url: string };
  jobs: Array<{ id: string; jobType: string; status: string; errorMessage?: string | null }>;
};

export default function ScanProgressPage() {
  const params = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      let shouldContinue = true;
      try {
        const next = await apiRequest<Scan>(`/scans/${params.id}`);
        if (!active) return;
        setScan(next);
        shouldContinue = !isTerminalScanStatus(next.status);
      } finally {
        if (active && shouldContinue) timeout = setTimeout(load, 2500);
      }
    };
    void load();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [params.id]);

  return (
    <ProtectedShell>
      {scan ? (
        <div className="space-y-6">
          <Card>
            <p className="text-sm font-medium text-slate-600">{scan.asset.name}</p>
            <h1 className="text-3xl font-semibold text-ink">Scan progress</h1>
            <p className="mt-2 text-sm text-slate-600">Polling for updates - {displayStatus(scan)}</p>
            {isTerminalScanStatus(scan.status) ? <Link className="mt-3 inline-block text-sm font-medium text-signal" href={`/scans/${scan.id}`}>View results</Link> : null}
          </Card>
          <div className="grid gap-3 md:grid-cols-5">
            <Meta label="Scanner" value={scannerLabel(scan.scanner)} />
            <Meta label="Mode" value={modeLabel(scan.scanMode)} />
            <Meta label="Progress" value={`${progress(scan)}%`} />
            <Meta
              label="Elapsed"
              value={formatScanElapsed(
                scan.startedAt ?? scan.createdAt,
                isTerminalScanStatus(scan.status) ? scan.completedAt : null,
              )}
            />
            <Meta label="Target" value={scan.targetUrl ?? scan.asset.url} />
            {scan.scanner === "sqlmap" ? <Meta label="Parameter" value={scan.testedParameter ?? "N/A"} /> : null}
            {scan.scanner === "sqlmap" ? <Meta label="Method" value={scan.httpMethod ?? "GET"} /> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {scan.jobs.map((job) => (
              <Card key={job.id}>
                <h2 className="font-semibold text-ink">{job.jobType}</h2>
                <p className="text-sm text-slate-600">{job.status}</p>
                {job.errorMessage ? <p className="mt-2 text-sm text-ember">{job.errorMessage}</p> : null}
              </Card>
            ))}
          </div>
        </div>
      ) : <p className="text-sm text-slate-600">Loading scan progress...</p>}
    </ProtectedShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-ink">{value}</p>
    </Card>
  );
}

function progress(scan: Scan) {
  if (scan.status === "COMPLETED") return 100;
  if (scan.status === "FAILED" || !scan.jobs.length) return 0;
  const completed = scan.jobs.filter((job) => job.status === "COMPLETED").length;
  const running = scan.jobs.some((job) => job.status === "RUNNING") ? 0.5 : 0;
  return Math.min(99, Math.round(((completed + running) / scan.jobs.length) * 100));
}

function displayStatus(scan: Scan) {
  const zapJob = scan.jobs.find((job) => job.jobType.startsWith("ZAP_"));
  const nucleiJob = scan.jobs.find((job) => job.jobType.startsWith("NUCLEI_"));
  const sqlmapJob = scan.jobs.find((job) => job.jobType.startsWith("SQLMAP_"));
  if (sqlmapJob) {
    if (sqlmapJob.status === "RUNNING") return "Running SQL Injection Detection";
    if (sqlmapJob.status === "COMPLETED" && scan.status === "RUNNING") return "Importing Findings";
    return scan.status;
  }
  if (nucleiJob) {
    if (nucleiJob.status === "RUNNING") return "Running / Parsing Results";
    if (nucleiJob.status === "COMPLETED" && scan.status === "RUNNING") return "Importing Findings";
    return scan.status;
  }
  if (!zapJob) return scan.status;
  if (zapJob.status === "RUNNING" && zapJob.jobType === "ZAP_FULL_SCAN") return "Spidering / Active Scanning";
  if (zapJob.status === "RUNNING") return "Passive Scanning";
  if (zapJob.status === "COMPLETED" && scan.status === "RUNNING") return "Importing Findings";
  return scan.status;
}

function scannerLabel(scanner?: string) {
  if (scanner === "owasp_zap") return "OWASP ZAP";
  if (scanner === "nuclei") return "Nuclei";
  if (scanner === "sqlmap") return "sqlmap";
  return "Internal";
}

function modeLabel(mode?: string) {
  if (mode === "zap_full") return "Full";
  if (mode === "zap_baseline") return "Baseline";
  if (mode === "nuclei_cve") return "CVE";
  if (mode === "nuclei_full") return "Full Template";
  if (mode === "nuclei_safe_baseline") return "Safe Baseline";
  if (mode === "sqlmap_detection") return "SQL Injection Detection";
  return "Baseline";
}
