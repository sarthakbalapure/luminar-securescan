"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, Input, Label } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/security-ui";
import { planDisplayName, type SubscriptionOverview } from "../../../lib/subscriptions";

type ApiEndpoint = { method: string; path: string; summary?: string };
type Asset = {
  id: string;
  name: string;
  url: string;
  type: string;
  riskLevel: string;
  environment?: string;
  businessCriticality?: string;
  verifiedStatus: string;
  project: { id: string; name: string; organizationId: string };
  apiSpecification?: { baseUrl: string; endpointsJson: ApiEndpoint[] } | null;
};
type Scan = { id: string; status: string; createdAt: string; completedAt?: string | null; securityScore?: string | number | null; _count?: { findings: number } };
type Finding = { id: string; status: string };
const confirmationText = "I confirm that I own this asset or have explicit authorization to scan it.";
const schema = z.object({ authorizationConfirmed: z.literal(true) });
const maxRepositoryZipBytes = 10 * 1024 * 1024;

function endpointKey(endpoint: ApiEndpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [scannerMode, setScannerMode] = useState<"internal" | "zap_baseline" | "zap_full" | "nuclei_safe_baseline" | "nuclei_cve" | "nuclei_full" | "sqlmap_detection">("internal");
  const [fullScanConfirmed, setFullScanConfirmed] = useState(false);
  const [sqlInjectionTestConfirmed, setSqlInjectionTestConfirmed] = useState(false);
  const [sqlmapTargetUrl, setSqlmapTargetUrl] = useState("");
  const [sqlmapMethod, setSqlmapMethod] = useState<"GET" | "POST">("GET");
  const [sqlmapParameter, setSqlmapParameter] = useState("");
  const [sqlmapPostBody, setSqlmapPostBody] = useState("");
  const [sqlmapAuthorizationHeader, setSqlmapAuthorizationHeader] = useState("");
  const [includePassiveBaselineScan, setIncludePassiveBaselineScan] = useState(false);
  const [apiBearerToken, setApiBearerToken] = useState("");
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [repositoryBranch, setRepositoryBranch] = useState("main");
  const [repositoryToken, setRepositoryToken] = useState("");
  const [repositoryZipBase64, setRepositoryZipBase64] = useState("");
  const [repositoryZipName, setRepositoryZipName] = useState("");
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null);

  function load() {
    apiRequest<Asset>(`/assets/${params.id}`)
      .then(async (nextAsset) => {
        const [nextScans, nextFindings, nextSubscription] = await Promise.all([
          apiRequest<Scan[]>(`/scans?assetId=${params.id}`),
          apiRequest<Finding[]>(`/findings?assetId=${params.id}`),
          apiRequest<SubscriptionOverview>(`/subscriptions/current?organizationId=${nextAsset.project.organizationId}`),
        ]);
        setAsset(nextAsset);
        setScans(nextScans);
        setFindings(nextFindings);
        setSubscription(nextSubscription);
        if (nextAsset.type === "API") setSelectedScope((nextAsset.apiSpecification?.endpointsJson ?? []).map(endpointKey));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Asset not found."));
  }

  useEffect(load, [params.id]);

  async function startScan() {
    setMessage("");
    if (!schema.safeParse({ authorizationConfirmed }).success) {
      setMessage("Authorization confirmation is required before starting a scan.");
      return;
    }
    setStarting(true);
    try {
      if (scannerMode === "sqlmap_detection") {
        const scan = await apiRequest<{ id: string }>("/scans/sqlmap", {
          method: "POST",
          body: JSON.stringify({
            assetId: params.id,
            scanner: "sqlmap",
            scanMode: "sqlmap_detection",
            targetUrl: sqlmapTargetUrl || asset?.url,
            method: sqlmapMethod,
            parameter: sqlmapParameter,
            postBody: sqlmapMethod === "POST" ? sqlmapPostBody : undefined,
            authorizationHeader: sqlmapAuthorizationHeader || undefined,
            authorizationConfirmed,
            sqlInjectionTestConfirmed,
          }),
        });
        router.push(`/scans/${scan.id}/progress`);
        return;
      }
      const scanType = asset?.type === "API" ? "API_BASELINE" : asset?.type === "REPOSITORY" ? "REPO_SCAN" : "WEBSITE_BASELINE";
      const useZap = scannerMode === "zap_baseline" || scannerMode === "zap_full";
      const useNuclei = scannerMode.startsWith("nuclei_");
      const scan = await apiRequest<{ id: string }>("/scans", {
        method: "POST",
        body: JSON.stringify({
          assetId: params.id,
          scanType,
          scanner: useNuclei ? "nuclei" : useZap ? "owasp_zap" : "internal",
          scanMode: useNuclei || useZap ? scannerMode : "baseline",
          authorizationConfirmed,
          fullScanConfirmed: scannerMode === "zap_full" || scannerMode === "nuclei_full" ? fullScanConfirmed : undefined,
          includePassiveBaselineScan: asset?.type === "WEBSITE" || asset?.type === "WEB_APP" ? includePassiveBaselineScan : false,
          apiBearerToken: asset?.type === "API" && apiBearerToken ? apiBearerToken : undefined,
          scanScopePaths: asset?.type === "API" ? selectedScope : undefined,
          repositoryBranch: asset?.type === "REPOSITORY" && repositoryBranch ? repositoryBranch : undefined,
          repositoryToken: asset?.type === "REPOSITORY" && repositoryToken ? repositoryToken : undefined,
          repositoryZipBase64: asset?.type === "REPOSITORY" && repositoryZipBase64 ? repositoryZipBase64 : undefined,
        }),
      });
      router.push(`/scans/${scan.id}/progress`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start scan.");
    } finally {
      setStarting(false);
    }
  }

  async function readRepositoryZip(file?: File) {
    setRepositoryZipBase64("");
    setRepositoryZipName("");
    if (!file) return;
    if (file.size > maxRepositoryZipBytes) {
      setMessage("Repository ZIP must be 10 MB or smaller.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }
    setRepositoryZipBase64(window.btoa(binary));
    setRepositoryZipName(file.name);
  }

  return (
    <ProtectedShell>
      {asset ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">{asset.project.name}</p>
                <h1 className="text-3xl font-semibold text-ink">{asset.name}</h1>
                <p className="mt-2 text-sm text-slate-600">{asset.url}</p>
                <p className="mt-2 text-sm text-slate-600">{asset.type} - {asset.verifiedStatus} - {asset.riskLevel}</p>
                {asset.type === "API" && asset.apiSpecification ? (
                  <p className="mt-2 text-sm text-slate-600">{asset.apiSpecification.endpointsJson.length} OpenAPI endpoints - {asset.apiSpecification.baseUrl}</p>
                ) : null}
              </div>
              <div className="text-right">
                <Button disabled={subscription?.scansRemaining === 0} onClick={() => setModalOpen(true)}>Start Scan</Button>
                {subscription ? <p className="mt-2 text-xs text-slate-600">{subscription.scansRemaining > 0 ? `${subscription.scansRemaining} scans remaining this month` : "Monthly scan limit reached"}</p> : null}
              </div>
            </div>
          </Card>
          <div className="grid gap-3 md:grid-cols-5">
            <Meta label="Environment" value={asset.environment ?? "PRODUCTION"} />
            <Meta label="Business Criticality" value={asset.businessCriticality ?? (asset.riskLevel === "HIGH" || asset.riskLevel === "CRITICAL" ? "HIGH" : asset.riskLevel === "LOW" ? "LOW" : "MEDIUM")} />
            <Meta label="Latest Security Score" value={String(scans[0]?.securityScore ?? "N/A")} />
            <Meta label="Latest Scan Status" value={scans[0]?.status ?? "N/A"} />
            <Meta label="Open Findings" value={String(findings.filter((finding) => finding.status !== "FIXED" && finding.status !== "FALSE_POSITIVE").length)} />
          </div>
          {message ? <Card className="text-sm text-ember">{message}</Card> : null}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-ink">Scan history</h2>
            {scans.map((scan) => (
              <Card key={scan.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">{scan.status}</p>
                  <p className="text-sm text-slate-600">{formatDate(scan.createdAt)} - {scan._count?.findings ?? 0} findings</p>
                </div>
                <Link className="text-sm font-medium text-signal" href={`/scans/${scan.id}`}>View scan</Link>
              </Card>
            ))}
            {!scans.length ? <Card className="text-sm text-slate-600">No scans yet.</Card> : null}
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Loading asset...</p>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
          <Card className="w-full max-w-lg">
            <h2 className="text-xl font-semibold text-ink">Confirm authorized scan</h2>
            {subscription ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-ink">{planDisplayName(subscription.subscription.planCode)} plan</p>
                <p className="mt-1">{subscription.scansRemaining > 0 ? `You have ${subscription.scansRemaining} scans remaining this month.` : "You have reached your monthly scan limit."}</p>
              </div>
            ) : null}
            {asset?.type === "WEBSITE" || asset?.type === "WEB_APP" || asset?.type === "API" ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="scannerMode">Scanner</Label>
                <select
                  id="scannerMode"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                  value={scannerMode}
                  onChange={(event) => {
                    setScannerMode(event.target.value as "internal" | "zap_baseline" | "zap_full" | "nuclei_safe_baseline" | "nuclei_cve" | "nuclei_full" | "sqlmap_detection");
                    setFullScanConfirmed(false);
                    setSqlInjectionTestConfirmed(false);
                  }}
                >
                  <option value="internal">Internal Baseline Scanner</option>
                  <option value="zap_baseline">OWASP ZAP Baseline Scan</option>
                  <option value="zap_full">OWASP ZAP Full Scan</option>
                  <option value="nuclei_safe_baseline">Nuclei Safe Baseline Scan</option>
                  <option value="nuclei_cve">Nuclei CVE Scan</option>
                  <option value="nuclei_full">Nuclei Full Template Scan</option>
                  <option value="sqlmap_detection">SQL Injection Detection Scan</option>
                </select>
              </div>
            ) : null}
            <label className="mt-4 flex gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={authorizationConfirmed}
                onChange={(event) => setAuthorizationConfirmed(event.target.checked)}
              />
              <span>{confirmationText}</span>
            </label>
            {scannerMode === "zap_full" || scannerMode === "nuclei_full" ? (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Full scan warning</p>
                <p className="mt-1">{scannerMode === "nuclei_full" ? "Full template scan may send multiple requests and trigger security controls or logs. Use only on assets you own or have explicit written authorization to test." : "Full scan may send multiple requests and perform deeper checks. Run this only on assets you own or have explicit written authorization to test."}</p>
                <label className="mt-3 flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={fullScanConfirmed}
                    onChange={(event) => setFullScanConfirmed(event.target.checked)}
                  />
                  <span>{scannerMode === "nuclei_full" ? "I understand this full template scan may generate higher traffic and should only be used on authorized test or production-approved targets." : "I understand this full scan may generate higher traffic and should only be used on authorized test or production-approved targets."}</span>
                </label>
              </div>
            ) : null}
            {scannerMode === "sqlmap_detection" ? (
              <div className="mt-4 space-y-4 rounded-md border border-slate-200 p-3">
                <p className="text-sm text-slate-700">This scan is detection-focused and does not dump data, extract database contents, or perform destructive actions.</p>
                <div className="space-y-2">
                  <Label htmlFor="sqlmapTargetUrl">Target endpoint URL</Label>
                  <Input id="sqlmapTargetUrl" value={sqlmapTargetUrl} onChange={(event) => setSqlmapTargetUrl(event.target.value)} placeholder={asset?.url} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sqlmapMethod">HTTP method</Label>
                  <select id="sqlmapMethod" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={sqlmapMethod} onChange={(event) => setSqlmapMethod(event.target.value as "GET" | "POST")}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sqlmapParameter">Parameter to test</Label>
                  <Input id="sqlmapParameter" value={sqlmapParameter} onChange={(event) => setSqlmapParameter(event.target.value)} placeholder="id" />
                </div>
                {sqlmapMethod === "POST" ? (
                  <div className="space-y-2">
                    <Label htmlFor="sqlmapPostBody">POST body</Label>
                    <Input id="sqlmapPostBody" value={sqlmapPostBody} onChange={(event) => setSqlmapPostBody(event.target.value)} placeholder="query=test" />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="sqlmapAuthorizationHeader">Optional authorization header</Label>
                  <Input id="sqlmapAuthorizationHeader" type="password" value={sqlmapAuthorizationHeader} onChange={(event) => setSqlmapAuthorizationHeader(event.target.value)} placeholder="Authorization: Bearer token" />
                </div>
                <label className="flex gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={sqlInjectionTestConfirmed}
                    onChange={(event) => setSqlInjectionTestConfirmed(event.target.checked)}
                  />
                  <span>I understand SQL injection testing may send test payloads to the selected endpoint and should only be used on authorized test or production-approved targets.</span>
                </label>
              </div>
            ) : asset?.type === "API" ? (
              <div className="mt-4 space-y-4 rounded-md border border-slate-200 p-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Optional bearer token</label>
                  <Input
                    value={apiBearerToken}
                    onChange={(event) => setApiBearerToken(event.target.value)}
                    type="password"
                    placeholder="Used only for safe HEAD/OPTIONS checks"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Scan scope</p>
                  <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                    {(asset.apiSpecification?.endpointsJson ?? []).map((endpoint) => {
                      const key = endpointKey(endpoint);
                      return (
                        <label key={key} className="flex gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedScope.includes(key)}
                            onChange={(event) => setSelectedScope((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))}
                          />
                          <span>{key}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : asset?.type === "REPOSITORY" ? (
              <div className="mt-4 space-y-4 rounded-md border border-slate-200 p-3">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={repositoryBranch} onChange={(event) => setRepositoryBranch(event.target.value)} placeholder="main" />
                </div>
                <div className="space-y-2">
                  <Label>Optional GitHub token</Label>
                  <Input
                    value={repositoryToken}
                    onChange={(event) => setRepositoryToken(event.target.value)}
                    type="password"
                    placeholder="Used only for this queued scan"
                  />
                  <p className="text-xs text-slate-500">The token is passed to the worker for cloning and is not stored in the scan summary.</p>
                </div>
                <div className="space-y-2">
                  <Label>Optional repository ZIP</Label>
                  <Input type="file" accept=".zip,application/zip" onChange={(event) => readRepositoryZip(event.target.files?.[0])} />
                  {repositoryZipName ? <p className="text-xs text-slate-500">{repositoryZipName} ready for isolated scan workspace.</p> : null}
                </div>
              </div>
            ) : (
              <label className="mt-4 flex gap-3 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={includePassiveBaselineScan}
                  onChange={(event) => setIncludePassiveBaselineScan(event.target.checked)}
                />
                <span>
                  Include passive web app baseline scan with OWASP ZAP
                  <span className="mt-1 block text-xs text-slate-500">Passive alerts only. No destructive or aggressive active attacks.</span>
                </span>
              </label>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Button className="bg-white text-ink ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button disabled={starting || subscription?.scansRemaining === 0 || !authorizationConfirmed || ((scannerMode === "zap_full" || scannerMode === "nuclei_full") && !fullScanConfirmed) || (scannerMode === "sqlmap_detection" && (!sqlInjectionTestConfirmed || !sqlmapParameter.trim()))} onClick={startScan}>{starting ? "Queueing..." : "Start scan"}</Button>
            </div>
          </Card>
        </div>
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
