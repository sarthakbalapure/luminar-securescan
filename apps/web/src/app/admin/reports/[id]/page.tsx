"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorState, Skeleton } from "../../../../components/ui";
import { apiRequest, apiResponse, downloadApiFile } from "../../../../lib/api";
import { AdminShell } from "../../admin-components";

type Report = {
  id: string;
  title?: string | null;
  reportType: string;
  scan: { asset: { name: string; project: { organization: { name: string } } } };
};

export default function AdminReportPreviewPage() {
  const params = useParams<{ id: string }>();
  const frame = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<Report>(`/reports/${params.id}`),
      apiResponse(`/reports/${params.id}/html`).then((response) => response.text()),
    ])
      .then(([nextReport, preview]) => { setReport(nextReport); setHtml(preview); })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Report could not be loaded."))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AdminShell>
      {loading ? <Skeleton className="h-[720px]" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {report && html ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-2xl font-semibold text-ink">{report.title ?? report.reportType}</h2><p className="text-sm text-slate-600">{report.scan.asset.project.organization.name} - {report.scan.asset.name}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => frame.current?.contentWindow?.print()}>Print</Button>
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => downloadApiFile(`/reports/${report.id}/findings.csv`, `luminar-findings-${report.id}.csv`)}>CSV</Button>
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => downloadApiFile(`/reports/${report.id}/json`, `luminar-report-${report.id}.json`)}>JSON</Button>
              <Button onClick={() => downloadApiFile(`/reports/${report.id}/download`, `luminar-report-${report.id}.pdf`)}>Download PDF</Button>
            </div>
          </div>
          <iframe ref={frame} title="Admin security report preview" sandbox="allow-same-origin" srcDoc={html} className="h-[1100px] w-full rounded-md border border-slate-200 bg-white" />
        </div>
      ) : null}
    </AdminShell>
  );
}
