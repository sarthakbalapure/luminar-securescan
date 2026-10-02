import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { makeFinding } from "../finding-factory";
import { assertAllowedTarget } from "../scanner-core";
import type { NormalizedFinding, ScannerModule } from "../types";

export type NucleiScanMode = "nuclei_safe_baseline" | "nuclei_cve" | "nuclei_full";

export type NucleiResult = {
  "template-id"?: string;
  "template-path"?: string;
  "matcher-name"?: string;
  "matched-at"?: string;
  host?: string;
  info?: {
    name?: string;
    severity?: string;
    description?: string;
    remediation?: string;
    tags?: string[] | string;
    classification?: {
      "cwe-id"?: string | string[];
      "cvss-score"?: number | string;
      "cvss-metrics"?: string;
    };
  };
  "extracted-results"?: string[];
  "curl-command"?: string;
};

const binary = () => process.env.NUCLEI_BINARY_PATH ?? "nuclei";
const outputDir = () => process.env.NUCLEI_OUTPUT_DIR ?? "./tmp/nuclei-results";
const rateLimit = () => String(Number(process.env.NUCLEI_RATE_LIMIT ?? 5));
const concurrency = () => String(Number(process.env.NUCLEI_CONCURRENCY ?? 5));
const requestTimeout = () => "10";

export const nucleiSafeBaselineScan: ScannerModule = {
  jobType: "NUCLEI_SAFE_BASELINE_SCAN",
  run: (target) => startNucleiScan(target, "nuclei_safe_baseline"),
};

export const nucleiCveScan: ScannerModule = {
  jobType: "NUCLEI_CVE_SCAN",
  run: (target) => startNucleiScan(target, "nuclei_cve"),
};

export const nucleiFullScan: ScannerModule = {
  jobType: "NUCLEI_FULL_SCAN",
  run: (target) => startNucleiScan(target, "nuclei_full"),
};

export async function checkNucleiAvailability(options: { binaryPath?: string } = {}) {
  await runCommand(options.binaryPath ?? binary(), ["-version"], 10_000);
  return { healthy: true };
}

export async function startNucleiScan(targetUrl: string, scanMode: NucleiScanMode, options: {
  binaryPath?: string;
  outputPath?: string;
  timeoutMs?: number;
} = {}) {
  const url = assertAllowedTarget(targetUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  if (process.env.NUCLEI_ENABLED === "false") throw new Error("Nuclei scanning is disabled.");

  const filePath = options.outputPath ?? path.join(outputDir(), `${randomUUID()}.jsonl`);
  await mkdir(path.dirname(filePath), { recursive: true });
  const args = buildNucleiCommand(url.toString(), scanMode, filePath);
  const timeoutMs = options.timeoutMs ?? (scanMode === "nuclei_full"
    ? Number(process.env.NUCLEI_FULL_SCAN_TIMEOUT_SECONDS ?? 1800) * 1000
    : Number(process.env.NUCLEI_TIMEOUT_SECONDS ?? 600) * 1000);

  try {
    await runCommand(options.binaryPath ?? binary(), args, timeoutMs);
    const results = await parseNucleiJsonOutput(filePath);
    return normalizeNucleiFindings(results, url.toString());
  } finally {
    if (!options.outputPath) await rm(filePath, { force: true }).catch(() => undefined);
  }
}

export function buildNucleiCommand(targetUrl: string, scanMode: NucleiScanMode, outputPath: string) {
  const args = [
    "-u", targetUrl,
    "-jsonl",
    "-o", outputPath,
    "-rl", rateLimit(),
    "-c", concurrency(),
    "-timeout", requestTimeout(),
    "-no-color",
  ];

  if (scanMode === "nuclei_cve") {
    args.push("-tags", "cve", "-severity", "medium,high,critical");
  } else if (scanMode === "nuclei_full") {
    args.push("-severity", "info,low,medium,high,critical", "-exclude-tags", "bruteforce,fuzzing,destructive,default-login");
  } else {
    args.push("-tags", "misconfig,exposure,tech,ssl,http", "-severity", "low,medium,high,critical");
  }

  const templatesPath = process.env.NUCLEI_TEMPLATES_PATH;
  if (templatesPath) args.push("-t", templatesPath);
  return args;
}

export async function parseNucleiJsonOutput(outputPath: string): Promise<NucleiResult[]> {
  const content = await readFile(outputPath, "utf8").catch(() => "");
  if (!content.trim()) return [];
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as NucleiResult;
      } catch {
        throw new Error("Invalid Nuclei JSONL output.");
      }
    });
}

export function normalizeNucleiFindings(results: NucleiResult[], targetUrl: string): NormalizedFinding[] {
  return results.map((result) => normalizeNucleiResult(result, targetUrl));
}

export function normalizeNucleiResult(result: NucleiResult, targetUrl: string): NormalizedFinding {
  const name = result.info?.name ?? result["template-id"] ?? "Nuclei template matched";
  const severity = mapNucleiSeverity(result.info?.severity);
  const affectedUrl = safeSameOriginUrl(result["matched-at"] ?? result.host, targetUrl);
  const cwe = normalizeCwe(result.info?.classification?.["cwe-id"]);
  const category = categoryFor(result);
  const tags = normalizeTags(result.info?.tags);
  const evidenceSummary = `${result["template-id"] ?? "nuclei-template"} matched ${affectedUrl}`;

  return makeFinding({
    title: name,
    description: result.info?.description ?? "Nuclei reported a template-based security finding for the authorized asset.",
    severity,
    category,
    affectedUrl,
    evidenceSummary,
    businessImpact: businessImpactFor(name, severity),
    technicalImpact: technicalImpactFor(name),
    remediationSummary: result.info?.remediation ?? remediationFor(name),
    retestSteps: "Run the Nuclei scan again and confirm the template no longer matches the affected URL.",
    cwe,
    owaspMapping: owaspFor(result),
    evidenceType: "NUCLEI_TEMPLATE_MATCH",
    observedValue: maskEvidence((result["extracted-results"] ?? [result["template-id"] ?? name]).join(", ")),
    expectedValue: "No matching Nuclei template result",
    rawJson: { scanner: "Nuclei", result: sanitizeNucleiResult(result) },
    recommendationType: "NUCLEI_REMEDIATION",
    source: "nuclei",
    rawNucleiResult: sanitizeNucleiResult(result),
    templateId: result["template-id"],
    templateName: name,
    matcherName: result["matcher-name"],
    extractedResults: (result["extracted-results"] ?? []).map(maskEvidence),
    curlCommand: undefined,
    nucleiSeverity: result.info?.severity,
    nucleiTags: tags,
    nucleiClassification: result.info?.classification,
  });
}

export function mapNucleiSeverity(severity?: string): NormalizedFinding["severity"] {
  const normalized = (severity ?? "").toLowerCase();
  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";
  return "INFO";
}

export function cancelNucleiScan() {
  return false;
}

function runCommand(command: string, args: string[], timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Nuclei scan timed out."));
    }, timeoutMs);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk).slice(0, 500);
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("Nuclei scanner is unavailable. Please check Nuclei configuration and try again."));
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr || `Nuclei command failed with exit code ${code}.`));
    });
  });
}

function normalizeTags(tags?: string[] | string) {
  if (Array.isArray(tags)) return tags.slice(0, 20);
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
  return [];
}

function sanitizeNucleiResult(result: NucleiResult) {
  const { "curl-command": _curlCommand, ...safe } = result;
  return {
    ...safe,
    "extracted-results": (safe["extracted-results"] ?? []).map(maskEvidence),
  };
}

function maskEvidence(value: string) {
  return value.replace(/(token|secret|password|apikey|api_key)=([^&\s]+)/gi, "$1=<redacted>");
}

function normalizeCwe(value?: string | string[]) {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return undefined;
  return first.toUpperCase().startsWith("CWE-") ? first.toUpperCase() : `CWE-${first}`;
}

function categoryFor(result: NucleiResult) {
  const text = `${result.info?.name ?? ""} ${result.info?.tags ?? ""}`.toLowerCase();
  if (text.includes("exposure") || text.includes("config")) return "Security Misconfiguration";
  if (text.includes("cve")) return "Known Vulnerability";
  if (text.includes("ssl") || text.includes("tls")) return "Cryptographic Failures";
  return "Template-Based Detection";
}

function owaspFor(result: NucleiResult) {
  const category = categoryFor(result);
  if (category === "Known Vulnerability") return ["Vulnerable and Outdated Components"];
  if (category === "Cryptographic Failures") return ["Cryptographic Failures"];
  return ["Security Misconfiguration"];
}

function businessImpactFor(name: string, severity: NormalizedFinding["severity"]) {
  if (/exposed|config|secret/i.test(name)) return "Sensitive configuration or secrets may be exposed and could increase compromise risk.";
  if (severity === "CRITICAL" || severity === "HIGH") return "The template match may represent a material security risk and should be prioritized for validation.";
  return "The finding may reduce browser, platform, or application security assurance.";
}

function technicalImpactFor(name: string) {
  if (/header/i.test(name)) return "The application may be missing a recommended hardening control.";
  if (/exposed|config/i.test(name)) return "Attackers may use exposed configuration details to support further compromise.";
  return "A Nuclei template matched a condition that should be reviewed by engineering.";
}

function remediationFor(name: string) {
  if (/exposed|config/i.test(name)) return "Remove the exposed file, block direct access at the web server layer, and rotate secrets if exposure is confirmed.";
  if (/header/i.test(name)) return "Add the recommended header or configuration after validating application compatibility.";
  return "Review the Nuclei finding, validate applicability, and apply the vendor or platform remediation guidance.";
}

function safeSameOriginUrl(candidate: string | undefined, target: string) {
  if (!candidate) return target;
  try {
    const candidateUrl = new URL(candidate);
    return candidateUrl.origin === new URL(target).origin ? candidateUrl.toString() : target;
  } catch {
    return target;
  }
}
