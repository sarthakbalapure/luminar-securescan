"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, ErrorState, Select, SeverityBadge, Skeleton, StatusBadge } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatEnum, statuses, type FindingStatus } from "../../../lib/security-ui";
import type { SubscriptionOverview } from "../../../lib/subscriptions";

type Finding = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: FindingStatus;
  category: string;
  owaspMapping: string[];
  cwe?: string | null;
  evidenceSummary: string;
  businessImpact: string;
  technicalImpact: string;
  remediationSummary: string;
  source?: string;
  zapRisk?: string | null;
  confidence?: string | null;
  solution?: string | null;
  reference?: string | null;
  cweId?: string | null;
  wascId?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  matcherName?: string | null;
  nucleiSeverity?: string | null;
  nucleiTags?: string[];
  testedParameter?: string | null;
  injectionType?: string | null;
  sqlmapRisk?: string | null;
  sqlmapLevel?: string | null;
  asset: { id: string; name: string; url: string; project: { organizationId: string } };
  scan: { id: string };
  evidence: Array<{
    evidenceType: string;
    url?: string | null;
    requestSummary?: string | null;
    responseSummary?: string | null;
    observedValue?: string | null;
    expectedValue?: string | null;
  }>;
  recommendations: Array<{
    recommendationType: string;
    remediationText: string;
    codeExample?: string | null;
    retestSteps: string;
  }>;
};

export default function FindingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus>("OPEN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("Please help me understand and fix this security issue.");
  const [requestingHelp, setRequestingHelp] = useState(false);

  function load() {
    apiRequest<Finding>(`/findings/${params.id}`)
      .then(async (nextFinding) => {
        setFinding(nextFinding);
        setSelectedStatus(nextFinding.status);
        setHelpSubject(`Help needed to fix: ${nextFinding.title}`);
        const nextSubscription = await apiRequest<SubscriptionOverview>(`/subscriptions/current?organizationId=${nextFinding.asset.project.organizationId}`);
        setSubscription(nextSubscription);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Finding could not be loaded."));
  }

  useEffect(load, [params.id]);

  async function updateStatus(nextStatus = selectedStatus) {
    if (!finding) return;
    if (!window.confirm(`Change finding status to ${formatEnum(nextStatus)}?`)) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest<Finding>(`/findings/${finding.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setFinding(updated);
      setSelectedStatus(updated.status);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function requestAdminHelp() {
    if (!finding) return;
    setRequestingHelp(true);
    setError("");
    try {
      const request = await apiRequest<{ id: string }>("/fix-requests", {
        method: "POST",
        body: JSON.stringify({ findingId: finding.id, subject: helpSubject, message: helpMessage }),
      });
      router.push(`/fix-requests/${request.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Fix support request could not be created.");
      setRequestingHelp(false);
    }
  }

  return (
    <ProtectedShell>
      {error ? <ErrorState message={error} /> : null}
      {!finding && !error ? <FindingSkeleton /> : null}
      {finding ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <StatusBadge status={finding.status} />
                </div>
                <h1 className="mt-3 text-3xl font-semibold text-ink">{finding.title}</h1>
                <p className="mt-2 text-sm text-slate-600">{finding.asset.url}</p>
              </div>
              <Link className="text-sm font-medium text-signal" href={`/scans/${finding.scan.id}`}>Back to scan</Link>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Detail title="Evidence" body={finding.evidenceSummary} />
              <Detail title="Business impact" body={finding.businessImpact} />
              <Detail title="Technical impact" body={finding.technicalImpact} />
              <Detail title="Recommended fix" body={finding.remediationSummary} />
              {finding.recommendations[0]?.remediationText ? (
                <Detail title="Remediation assistant" body={finding.recommendations[0].remediationText} />
              ) : null}
              {finding.recommendations[0]?.codeExample ? (
                <Card>
                  <h2 className="font-semibold text-ink">Code or configuration example</h2>
                  <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-white">{finding.recommendations[0].codeExample}</pre>
                </Card>
              ) : null}
              <Detail title="Retest steps" body={finding.recommendations[0]?.retestSteps ?? "Run a new scan and confirm this finding no longer appears."} />
              <Card>
                <h2 className="font-semibold text-ink">Observed evidence</h2>
                <div className="mt-3 space-y-3">
                  {finding.evidence.map((item) => (
                    <div key={`${item.evidenceType}-${item.url ?? item.observedValue}`} className="rounded-md border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-ink">{formatEnum(item.evidenceType)}</p>
                      {item.url ? <p className="mt-1 text-slate-600">URL: {item.url}</p> : null}
                      {item.responseSummary ? <p className="mt-1 text-slate-600">{item.responseSummary}</p> : null}
                      {item.observedValue ? <p className="mt-1 text-slate-700">Observed: {item.observedValue}</p> : null}
                      {item.expectedValue ? <p className="mt-1 text-slate-700">Expected: {item.expectedValue}</p> : null}
                    </div>
                  ))}
                  {!finding.evidence.length ? <p className="text-sm text-slate-600">No structured evidence was recorded.</p> : null}
                </div>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <h2 className="font-semibold text-ink">Finding metadata</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Meta label="Affected URL" value={finding.evidence[0]?.url ?? finding.asset.url} />
                  <Meta label="Source" value={finding.source === "owasp_zap" ? "OWASP ZAP" : finding.source === "nuclei" ? "Nuclei" : finding.source === "sqlmap" ? "sqlmap" : "Internal"} />
                  <Meta label="Category" value={finding.category} />
                  <Meta label="OWASP mapping" value={finding.owaspMapping.join(", ") || "Security Misconfiguration"} />
                  <Meta label="CWE" value={finding.cwe ?? "N/A"} />
                  {finding.source === "owasp_zap" ? (
                    <>
                      <Meta label="ZAP risk" value={finding.zapRisk ?? "N/A"} />
                      <Meta label="Confidence" value={finding.confidence ?? "N/A"} />
                      <Meta label="CWE ID" value={finding.cweId ?? "N/A"} />
                      <Meta label="WASC ID" value={finding.wascId ?? "N/A"} />
                      <Meta label="Reference" value={finding.reference ?? "N/A"} />
                      <Meta label="Solution" value={finding.solution ?? finding.remediationSummary} />
                    </>
                  ) : null}
                  {finding.source === "nuclei" ? (
                    <>
                      <Meta label="Template ID" value={finding.templateId ?? "N/A"} />
                      <Meta label="Template Name" value={finding.templateName ?? finding.title} />
                      <Meta label="Matcher" value={finding.matcherName ?? "N/A"} />
                      <Meta label="Nuclei severity" value={finding.nucleiSeverity ?? finding.severity} />
                      <Meta label="Tags" value={finding.nucleiTags?.join(", ") || "N/A"} />
                    </>
                  ) : null}
                  {finding.source === "sqlmap" ? (
                    <>
                      <Meta label="Tested Parameter" value={finding.testedParameter ?? "N/A"} />
                      <Meta label="HTTP Method" value={finding.scan ? "See scan details" : "N/A"} />
                      <Meta label="Injection Risk" value={finding.sqlmapRisk ?? "1"} />
                      <Meta label="SQLMap Level" value={finding.sqlmapLevel ?? "1"} />
                      <Meta label="Injection Type" value={finding.injectionType ?? "SQL injection"} />
                    </>
                  ) : null}
                </dl>
              </Card>
              <Card>
                <h2 className="font-semibold text-ink">Update status</h2>
                <div className="mt-4 space-y-3">
                  <Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as FindingStatus)}>
                    {statuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
                  </Select>
                  <Button className="w-full" disabled={saving} onClick={() => updateStatus()}>{saving ? "Saving..." : "Update status"}</Button>
                  <div className="grid gap-2">
                    <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => updateStatus("FALSE_POSITIVE")}>Mark false positive</Button>
                    <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => updateStatus("RISK_ACCEPTED")}>Accept risk</Button>
                    <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => updateStatus("FIXED")}>Mark fixed</Button>
                  </div>
                </div>
              </Card>
              <Card>
                <h2 className="font-semibold text-ink">Admin remediation support</h2>
                {subscription?.subscription.planCode === "MAX" ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-slate-600">Fix support requests remaining this month: {subscription.fixRequestsRemaining} / {subscription.subscription.monthlyFixRequestLimit}</p>
                    <Button className="w-full" disabled={subscription.fixRequestsRemaining === 0} onClick={() => setHelpOpen(true)}>Request Admin Help</Button>
                    {subscription.fixRequestsRemaining === 0 ? <p className="text-sm text-red-700">You have used all 10 admin support requests for this month.</p> : null}
                  </div>
                ) : <p className="mt-3 text-sm text-slate-600">Admin fix support is available only in Max plan.</p>}
              </Card>
            </aside>
          </div>
        </div>
      ) : null}
      {helpOpen && finding ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
          <Card className="w-full max-w-lg">
            <h2 className="text-xl font-semibold text-ink">Request Admin Help</h2>
            <p className="mt-1 text-sm text-slate-600">Related finding: {finding.title}</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Subject</label>
            <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={helpSubject} maxLength={200} onChange={(event) => setHelpSubject(event.target.value)} />
            <label className="mt-4 block text-sm font-medium text-slate-700">Message</label>
            <textarea className="mt-2 min-h-32 w-full rounded-md border border-slate-300 p-3 text-sm" value={helpMessage} maxLength={5000} onChange={(event) => setHelpMessage(event.target.value)} />
            <div className="mt-5 flex justify-end gap-3">
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" disabled={requestingHelp} onClick={() => setHelpOpen(false)}>Cancel</Button>
              <Button disabled={requestingHelp || helpSubject.trim().length < 3 || helpMessage.trim().length < 10} onClick={requestAdminHelp}>{requestingHelp ? "Sending..." : "Send Request"}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </ProtectedShell>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{body}</p>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}

function FindingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40" />
      <Skeleton className="h-96" />
    </div>
  );
}
