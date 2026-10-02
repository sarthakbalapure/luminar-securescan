"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, ErrorState, Skeleton } from "../../../components/ui";
import { apiRequest, apiResponse, downloadApiFile } from "../../../lib/api";

type Report = {
  id: string;
  title?: string | null;
  reportType: string;
  reportStatus: string;
  generatedAt: string;
  scan: { id: string; asset: { name: string; url: string; project: { name: string; organization: { name: string } } } };
};

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<Report>(`/reports/${params.id}`),
      apiResponse(`/reports/${params.id}/html`).then((response) => response.text()),
    ])
      .then(([nextReport, preview]) => { setReport(nextReport); setHtml(preview); })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Report could not be loaded."))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function removeReport() {
    if (!window.confirm("Delete this generated report and all stored export files?")) return;
    setDeleting(true);
    try {
      await apiRequest(`/reports/${params.id}`, { method: "DELETE" });
      router.replace("/reports");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Report could not be deleted.");
      setDeleting(false);
    }
  }

  return (
    <ProtectedShell>
      {loading ? <Skeleton className="h-[720px]" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {report && html ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-signal">Protected report preview</p>
              <h1 className="text-3xl font-semibold text-ink">{report.title ?? "Security Audit Report"}</h1>
              <p className="mt-1 text-sm text-slate-600">{report.scan.asset.project.organization.name} - {report.scan.asset.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => frame.current?.contentWindow?.print()}>Print</Button>
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => downloadApiFile(`/reports/${report.id}/findings.csv`, `luminar-findings-${report.id}.csv`)}>Export CSV</Button>
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => downloadApiFile(`/reports/${report.id}/json`, `luminar-report-${report.id}.json`)}>Export JSON</Button>
              <Button onClick={() => downloadApiFile(`/reports/${report.id}/download`, `luminar-securescan-${report.id}.pdf`)}>Download PDF</Button>
              <Button className="bg-red-700 hover:bg-red-800" disabled={deleting} onClick={removeReport}>{deleting ? "Deleting..." : "Delete"}</Button>
            </div>
          </div>
          <iframe ref={frame} title="Security report preview" sandbox="allow-same-origin" srcDoc={html} className="h-[1100px] w-full rounded-md border border-slate-200 bg-white" />
        </div>
      ) : null}
    </ProtectedShell>
  );
}
