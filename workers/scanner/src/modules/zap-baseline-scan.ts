import { makeFinding } from "../finding-factory";
import { assertAllowedTarget } from "../scanner-core";
import { withTimeout } from "../scanner-utils";
import type { NormalizedFinding, ScannerModule } from "../types";

export type ZapAlert = {
  alert?: string;
  name?: string;
  risk?: string;
  confidence?: string;
  description?: string;
  solution?: string;
  reference?: string;
  url?: string;
  param?: string;
  evidence?: string;
  cweid?: string;
  wascid?: string;
  pluginId?: string;
  alertRef?: string;
  tags?: Record<string, string>;
};

type ZapApiResponse<T> = T & {
  code?: string;
  message?: string;
};

const defaultZapApiUrl = process.env.ZAP_API_URL ?? "http://localhost:8080";
const defaultZapBaselineTimeout = Number(process.env.ZAP_BASELINE_TIMEOUT_SECONDS ?? 300) * 1000;
const defaultZapFullTimeout = Number(process.env.ZAP_FULL_SCAN_TIMEOUT_SECONDS ?? 1800) * 1000;
const defaultPollIntervalMs = Number(process.env.ZAP_POLL_INTERVAL_MS ?? 5_000);
const defaultAlertLimit = Number(process.env.ZAP_ALERT_LIMIT ?? 100);
const defaultApiRequestTimeoutMs = Number(process.env.ZAP_API_REQUEST_TIMEOUT_MS ?? 60_000);

export const zapBaselineScan: ScannerModule = {
  jobType: "ZAP_BASELINE_SCAN",
  async run(target: string): Promise<NormalizedFinding[]> {
    assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    return withTimeout("OWASP ZAP passive baseline scan", runZapBaseline(target), defaultZapBaselineTimeout);
  },
};

export const zapFullScan: ScannerModule = {
  jobType: "ZAP_FULL_SCAN",
  async run(target: string): Promise<NormalizedFinding[]> {
    assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    return withTimeout("OWASP ZAP full scan", runZapFull(target), defaultZapFullTimeout);
  },
};

export async function runZapBaseline(target: string, options: {
  apiUrl?: string;
  apiKey?: string;
  requestTimeoutMs?: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  alertLimit?: number;
} = {}) {
  const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  const client = new ZapClient(
    options.apiUrl ?? defaultZapApiUrl,
    options.apiKey ?? process.env.ZAP_API_KEY,
    options.requestTimeoutMs,
  );
  const timeoutAt = Date.now() + (options.timeoutMs ?? defaultZapBaselineTimeout);
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;

  await client.action("core", "newSession", {
    name: `luminar-securescan-${Date.now()}`,
    overwrite: "true",
  });
  await client.action("core", "accessUrl", {
    url: url.toString(),
    followRedirects: "true",
  });

  while (Date.now() < timeoutAt) {
    const records = await client.view<{ recordsToScan?: string }>("pscan", "recordsToScan");
    if (Number(records.recordsToScan ?? 0) <= 0) break;
    await delay(pollIntervalMs);
  }

  if (Date.now() >= timeoutAt) {
    throw new Error(`OWASP ZAP passive baseline scan timed out after ${options.timeoutMs ?? defaultZapBaselineTimeout}ms`);
  }

  const alerts = await client.view<{ alerts?: ZapAlert[] }>("core", "alerts", {
    baseurl: url.origin,
    start: "0",
    count: String(options.alertLimit ?? defaultAlertLimit),
  });

  return (alerts.alerts ?? []).map((alert) => normalizeZapAlert(alert, target, "PASSIVE_BASELINE"));
}

export async function runZapFull(target: string, options: {
  apiUrl?: string;
  apiKey?: string;
  requestTimeoutMs?: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  alertLimit?: number;
} = {}) {
  const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  const client = new ZapClient(
    options.apiUrl ?? defaultZapApiUrl,
    options.apiKey ?? process.env.ZAP_API_KEY,
    options.requestTimeoutMs,
  );
  const timeoutAt = Date.now() + (options.timeoutMs ?? defaultZapFullTimeout);
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs;

  await client.action("core", "newSession", {
    name: `luminar-securescan-full-${Date.now()}`,
    overwrite: "true",
  });
  await client.action("core", "accessUrl", {
    url: url.toString(),
    followRedirects: "true",
  });

  const spider = await client.action<{ scan?: string }>("spider", "scan", { url: url.toString(), maxChildren: "50", recurse: "true" });
  const spiderId = spider.scan ?? "0";
  while (Date.now() < timeoutAt) {
    const status = await client.view<{ status?: string }>("spider", "status", { scanId: spiderId });
    if (Number(status.status ?? 0) >= 100) break;
    await delay(pollIntervalMs);
  }

  const active = await client.action<{ scan?: string }>("ascan", "scan", {
    url: url.toString(),
    recurse: "true",
    inScopeOnly: "false",
  });
  const activeScanId = active.scan ?? "0";
  while (Date.now() < timeoutAt) {
    const status = await client.view<{ status?: string }>("ascan", "status", { scanId: activeScanId });
    if (Number(status.status ?? 0) >= 100) break;
    await delay(pollIntervalMs);
  }

  if (Date.now() >= timeoutAt) {
    await client.action("ascan", "stop", { scanId: activeScanId }).catch(() => undefined);
    throw new Error(`OWASP ZAP full scan timed out after ${options.timeoutMs ?? defaultZapFullTimeout}ms`);
  }

  const alerts = await client.view<{ alerts?: ZapAlert[] }>("core", "alerts", {
    baseurl: url.origin,
    start: "0",
    count: String(options.alertLimit ?? defaultAlertLimit),
  });

  return (alerts.alerts ?? []).map((alert) => normalizeZapAlert(alert, target, "FULL_SCAN"));
}

export async function checkZapHealth(options: { apiUrl?: string; apiKey?: string; requestTimeoutMs?: number } = {}) {
  const client = new ZapClient(
    options.apiUrl ?? defaultZapApiUrl,
    options.apiKey ?? process.env.ZAP_API_KEY,
    options.requestTimeoutMs,
  );
  const version = await client.view<{ version?: string }>("core", "version");
  return { healthy: Boolean(version.version), version: version.version ?? "unknown" };
}

export function normalizeZapAlert(alert: ZapAlert, target: string, mode = "PASSIVE_BASELINE"): NormalizedFinding {
  const title = alert.alert ?? alert.name ?? "OWASP ZAP passive baseline alert";
  const severity = mapZapRiskToSeverity(alert.risk);
  const affectedUrl = alert.url && isSameOrigin(alert.url, target) ? alert.url : target;
  const safeAlert = redactZapAlert(alert);
  const evidenceParts = [
    alert.risk ? `Risk: ${alert.risk}` : undefined,
    alert.confidence ? `Confidence: ${alert.confidence}` : undefined,
    alert.param ? `Parameter: ${alert.param}` : undefined,
    alert.evidence ? `Evidence: ${alert.evidence}` : undefined,
  ].filter(Boolean);

  return makeFinding({
    title: `OWASP ZAP: ${title}`,
    description: alert.description || "OWASP ZAP reported a passive baseline web application security alert.",
    severity,
    category: "OWASP ZAP Baseline",
    affectedUrl,
    evidenceSummary: evidenceParts.join(" | ") || "OWASP ZAP passive alert was imported.",
    businessImpact: businessImpactFor(severity),
    technicalImpact: alert.description || "The passive scanner observed a web application condition that should be reviewed.",
    remediationSummary: alert.solution || "Review the ZAP alert, validate the affected endpoint, and apply a defensive configuration or code fix.",
    retestSteps: "Rerun the passive ZAP baseline scan and confirm the alert no longer appears for the affected URL.",
    cwe: alert.cweid && alert.cweid !== "0" ? `CWE-${alert.cweid}` : undefined,
    source: "owasp_zap",
    rawZapAlert: safeAlert,
    zapRisk: alert.risk,
    confidence: alert.confidence,
    solution: alert.solution,
    reference: alert.reference,
    cweId: alert.cweid,
    wascId: alert.wascid,
    owaspMapping: mapZapOwasp(alert),
    evidenceType: "OWASP_ZAP_ALERT",
    responseSummary: alert.reference,
    observedValue: alert.evidence ?? alert.description ?? alert.alert,
    expectedValue: "No matching OWASP ZAP passive alert",
    rawJson: {
      scanner: "OWASP ZAP",
      mode,
      alert: safeAlert,
    },
    recommendationType: "OWASP_ZAP_BASELINE",
  });
}

export function mapZapRiskToSeverity(risk?: string): NormalizedFinding["severity"] {
  const normalized = (risk ?? "").toLowerCase();
  if (normalized.includes("high")) return "HIGH";
  if (normalized.includes("medium")) return "MEDIUM";
  if (normalized.includes("low")) return "LOW";
  return "INFO";
}

class ZapClient {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey?: string,
    private readonly requestTimeoutMs = defaultApiRequestTimeoutMs,
  ) {}

  action<T extends object>(component: string, name: string, params: Record<string, string> = {}) {
    return this.request<T>("action", component, name, params);
  }

  view<T extends object>(component: string, name: string, params: Record<string, string> = {}) {
    return this.request<T>("view", component, name, params);
  }

  private async request<T extends object>(kind: "action" | "view", component: string, name: string, params: Record<string, string>) {
    const requestUrl = new URL(`/JSON/${component}/${kind}/${name}/`, this.apiUrl);
    for (const [key, value] of Object.entries(params)) requestUrl.searchParams.set(key, value);
    if (this.apiKey) requestUrl.searchParams.set("apikey", this.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`OWASP ZAP API returned HTTP ${response.status} for ${component}/${name}`);
      const payload = await response.json() as ZapApiResponse<T>;
      if (payload.code === "error") throw new Error(payload.message || `OWASP ZAP API error for ${component}/${name}`);
      return payload as T;
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))) {
        throw new Error(`OWASP ZAP API request ${component}/${name} timed out after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapZapOwasp(alert: ZapAlert) {
  const text = [
    alert.alert,
    alert.description,
    alert.tags ? Object.keys(alert.tags).join(" ") : "",
  ].join(" ").toLowerCase();
  if (text.includes("injection")) return ["Injection"];
  if (text.includes("auth") || text.includes("session")) return ["Identification and Authentication Failures"];
  if (text.includes("crypto") || text.includes("tls") || text.includes("https")) return ["Cryptographic Failures"];
  if (text.includes("access control")) return ["Broken Access Control"];
  if (text.includes("component") || text.includes("outdated")) return ["Vulnerable and Outdated Components"];
  return ["Security Misconfiguration"];
}

function redactZapAlert(alert: ZapAlert) {
  const { evidence, ...safeAlert } = alert;
  return {
    ...safeAlert,
    evidence: evidence ? "<redacted zap evidence>" : undefined,
  };
}

function businessImpactFor(severity: NormalizedFinding["severity"]) {
  if (severity === "HIGH") return "The alert may represent a material web application risk and should be prioritized for remediation.";
  if (severity === "MEDIUM") return "The alert can increase business exposure when combined with other weaknesses or sensitive workflows.";
  if (severity === "LOW") return "The alert is a hardening opportunity that can reduce cumulative security risk.";
  return "The alert provides additional security context for engineering review.";
}

function isSameOrigin(candidate: string, target: string) {
  try {
    return new URL(candidate).origin === new URL(target).origin;
  } catch {
    return false;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
