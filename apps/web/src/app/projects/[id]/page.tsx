"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Card, SeverityBadge, StatusBadge } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/security-ui";

type Asset = { id: string; name: string; url: string; type: string; riskLevel: string; verifiedStatus: string };
type Scan = { id: string; status: string; createdAt: string; securityScore?: string | number | null; asset?: { name: string } };
type Finding = { id: string; title: string; severity: string; status: string; asset?: { name: string } };
type Report = { id: string; reportType: string; generatedAt: string; scan: { asset: { project: { name: string } } } };
type Project = { id: string; name: string; description?: string | null; organization: { name: string }; assets: Asset[] };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<Project>(`/projects/${params.id}`),
      apiRequest<Scan[]>("/scans"),
      apiRequest<Finding[]>("/findings"),
      apiRequest<Report[]>("/reports"),
    ])
      .then(([nextProject, nextScans, nextFindings, nextReports]) => {
        setProject(nextProject);
        const assetIds = new Set(nextProject.assets.map((asset) => asset.id));
        setScans(nextScans.filter((scan) => !scan.asset || nextProject.assets.some((asset) => asset.name === scan.asset?.name)).slice(0, 5));
        setFindings(nextFindings.filter((finding) => !finding.asset || nextProject.assets.some((asset) => asset.name === finding.asset?.name)).slice(0, 5));
        setReports(nextReports.filter((report) => report.scan.asset.project.name === nextProject.name).slice(0, 5));
        void assetIds;
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Project not found."));
  }, [params.id]);

  return (
    <ProtectedShell>
      {message ? <Card className="text-sm text-ember">{message}</Card> : null}
      {project ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-600">{project.organization.name}</p>
              <h1 className="text-3xl font-semibold text-ink">{project.name}</h1>
              {project.description ? <p className="mt-2 text-slate-600">{project.description}</p> : null}
            </div>
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href={`/assets/new?projectId=${project.id}`}>
              Add asset
            </Link>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Meta label="Asset Count" value={String(project.assets.length)} />
              <Meta label="Scan Count" value={String(scans.length)} />
              <Meta label="Open Findings" value={String(findings.filter((finding) => finding.status !== "FIXED" && finding.status !== "FALSE_POSITIVE").length)} />
              <Meta label="Risk Status" value={project.assets.some((asset) => asset.riskLevel === "CRITICAL" || asset.riskLevel === "HIGH") ? "Needs attention" : "Monitored"} />
            </div>
            <h2 className="text-2xl font-semibold text-ink">Assets</h2>
            {project.assets.map((asset) => (
              <Card key={asset.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link className="font-semibold text-ink hover:text-signal" href={`/assets/${asset.id}`}>{asset.name}</Link>
                    <p className="text-sm text-slate-600">{asset.url}</p>
                  </div>
                  <p className="text-sm text-slate-600">{asset.type} · {asset.verifiedStatus} · {asset.riskLevel}</p>
                </div>
              </Card>
            ))}
            {!project.assets.length ? <Card className="text-sm text-slate-600">No assets yet.</Card> : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="font-semibold text-ink">Latest scans</h2>
              <div className="mt-3 space-y-3">
                {scans.map((scan) => <p key={scan.id} className="text-sm text-slate-600"><StatusBadge status={scan.status} /> <span className="ml-2">{formatDate(scan.createdAt)}</span></p>)}
                {!scans.length ? <p className="text-sm text-slate-600">No scans yet.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-ink">Open findings</h2>
              <div className="mt-3 space-y-3">
                {findings.map((finding) => <p key={finding.id} className="text-sm text-slate-600"><SeverityBadge severity={finding.severity} /> <span className="ml-2">{finding.title}</span></p>)}
                {!findings.length ? <p className="text-sm text-slate-600">No findings yet.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-ink">Reports</h2>
              <div className="mt-3 space-y-3">
                {reports.map((report) => <Link key={report.id} className="block text-sm font-medium text-signal" href={`/reports/${report.id}`}>{report.reportType} - {formatDate(report.generatedAt)}</Link>)}
                {!reports.length ? <p className="text-sm text-slate-600">No reports yet.</p> : null}
              </div>
            </Card>
          </div>
        </div>
      ) : !message ? (
        <p className="text-sm text-slate-600">Loading project...</p>
      ) : null}
    </ProtectedShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </Card>
  );
}
