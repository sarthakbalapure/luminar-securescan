import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { makeFinding } from "../finding-factory";
import { assertAllowedTarget } from "../scanner-core";
import type { NormalizedFinding, ScannerContext } from "../types";

export type SqlmapScanConfig = {
  targetUrl: string;
  method: "GET" | "POST";
  parameter: string;
  postBody?: string;
  authorizationHeader?: string;
};

export type ParsedSqlmapResult = {
  injectable: boolean;
  injectionType?: string;
  summary: string;
};

const forbiddenOptions = [
  "--dump",
  "--dump-all",
  "--os-shell",
  "--os-pwn",
  "--file-read",
  "--file-write",
  "--sql-shell",
  "--passwords",
  "--privileges",
  "--roles",
  "--dbs",
  "--tables",
  "--columns",
  "--tamper",
  "--crawl",
  "--forms",
];

export const sqlmapDetectionScan = {
  jobType: "SQLMAP_DETECTION_SCAN",
  async run(_assetUrl: string, context?: ScannerContext): Promise<NormalizedFinding[]> {
    if (!context?.sqlmapConfig) throw new Error("SQL injection scan configuration was missing.");
    return startSqlmapDetectionScan(context.sqlmapConfig);
  },
};

export async function checkSqlmapAvailability(binaryPath = process.env.SQLMAP_BINARY_PATH ?? "sqlmap") {
  await runCommand(binaryPath, ["--version"], Number(process.env.SQLMAP_TIMEOUT_SECONDS ?? 600) * 1000);
  return { healthy: true };
}

export async function startSqlmapDetectionScan(config: SqlmapScanConfig, options: { binaryPath?: string; timeoutMs?: number } = {}) {
  assertAllowedTarget(config.targetUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  if (process.env.SQLMAP_ENABLED === "false") throw new Error("sqlmap scanning is disabled.");
  await mkdir(process.env.SQLMAP_OUTPUT_DIR ?? "./tmp/sqlmap-results", { recursive: true });
  const args = buildSqlmapArgs(config);
  const output = await runCommand(options.binaryPath ?? process.env.SQLMAP_BINARY_PATH ?? "sqlmap", args, options.timeoutMs ?? Number(process.env.SQLMAP_TIMEOUT_SECONDS ?? 600) * 1000);
  const parsed = parseSqlmapOutput(output);
  return parsed.injectable ? [normalizeSqlmapFinding(parsed, config)] : [];
}

export function buildSqlmapArgs(config: SqlmapScanConfig) {
  validateConfig(config);
  const args = [
    "-u", config.targetUrl,
    "-p", config.parameter,
    "--batch",
    `--risk=${safeNumber(process.env.SQLMAP_RISK, 1, 1, 1)}`,
    `--level=${safeNumber(process.env.SQLMAP_LEVEL, 1, 1, 1)}`,
    "--timeout=10",
    "--retries=1",
    "--smart",
    "--flush-session",
  ];
  if (config.method === "POST") {
    args.push("--method=POST", "--data", config.postBody ?? `${encodeURIComponent(config.parameter)}=test`);
  }
  if (config.authorizationHeader) {
    args.push("-H", sanitizeAuthorizationHeader(config.authorizationHeader));
  }
  if (args.some((arg) => forbiddenOptions.some((option) => arg === option || arg.startsWith(`${option}=`)))) {
    throw new Error("Forbidden sqlmap option detected.");
  }
  return args;
}

export function parseSqlmapOutput(outputText: string): ParsedSqlmapResult {
  const sanitized = sanitizeOutput(outputText);
  const noFinding = /all tested parameters do not appear to be injectable|does not seem to be injectable|no parameter\(s\) found for testing/i.test(sanitized);
  const positive = /parameter ['"`\[]?[\w.\-[\]]+['"`\]]?.{0,120}(appears to be|is).{0,80}injectable|is vulnerable/i.test(sanitized);
  if (positive && !noFinding) {
    const injectionType = /appears to be ['"`]?([^'"`\r\n]+?)['"`]? injectable/i.exec(sanitized)?.[1] ?? "SQL injection";
    return { injectable: true, injectionType, summary: "SQL injection detection reported the selected parameter may be injectable." };
  }
  return { injectable: false, summary: "sqlmap did not report SQL injection for the selected parameter." };
}

export function normalizeSqlmapFinding(parsed: ParsedSqlmapResult, config: SqlmapScanConfig): NormalizedFinding {
  return makeFinding({
    title: "Possible SQL Injection Detected",
    description: "Automated SQL injection detection identified that the selected parameter may be injectable. Manual validation is recommended before production remediation.",
    severity: "HIGH",
    category: "Injection",
    affectedUrl: config.targetUrl,
    evidenceSummary: `Automated SQL injection detection identified that the parameter "${config.parameter}" may be injectable. Manual validation is recommended before production remediation.`,
    businessImpact: "SQL injection may allow unauthorized access to application data, data modification, or bypass of application logic depending on database permissions and application context.",
    technicalImpact: "The application may be building database queries using unsanitized user input instead of parameterized queries or ORM-safe query methods.",
    remediationSummary: "Use parameterized queries, prepared statements, ORM query binding, strict input validation, and least-privilege database permissions.",
    retestSteps: "Apply remediation, deploy the fix, then rerun the SQL injection detection scan for the same endpoint and parameter.",
    owaspMapping: ["Injection"],
    cwe: "CWE-89",
    evidenceType: "SQLMAP_DETECTION_SUMMARY",
    observedValue: parsed.summary,
    expectedValue: "No SQL injection detection for the selected endpoint and parameter",
    rawJson: { scanner: "sqlmap", summary: parsed.summary, method: config.method, parameter: config.parameter },
    recommendationType: "SQL_INJECTION_REMEDIATION",
    source: "sqlmap",
    testedParameter: config.parameter,
    injectionType: parsed.injectionType ?? "SQL injection",
    sqlmapRisk: process.env.SQLMAP_RISK ?? "1",
    sqlmapLevel: process.env.SQLMAP_LEVEL ?? "1",
    rawSqlmapSummary: { injectable: parsed.injectable, summary: parsed.summary, method: config.method },
  });
}

export function cancelSqlmapScan() {
  return false;
}

function validateConfig(config: SqlmapScanConfig) {
  const url = assertAllowedTarget(config.targetUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  if (!["GET", "POST"].includes(config.method)) throw new Error("Only GET and POST methods are supported for SQL injection detection.");
  if (!/^[A-Za-z0-9_.\-[\]]{1,120}$/.test(config.parameter)) throw new Error("Parameter name contains unsupported characters.");
  if (config.method === "GET" && !url.searchParams.has(config.parameter)) {
    throw new Error("GET target URL must include the tested parameter.");
  }
  if (config.postBody && /[\r\n]/.test(config.postBody)) throw new Error("POST body contains unsupported line breaks.");
  if (config.authorizationHeader && /[\r\n]/.test(config.authorizationHeader)) throw new Error("Authorization header contains unsupported characters.");
}

function sanitizeAuthorizationHeader(value: string) {
  if (!/^Authorization:\s+\S.+$/i.test(value)) throw new Error("Only a single Authorization header is supported.");
  return value;
}

function runCommand(command: string, args: string[], timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("sqlmap scan timed out."));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk).slice(0, 1000);
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("sqlmap scanner is unavailable. Please check sqlmap configuration."));
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(`${stdout}\n${stderr}`);
      else reject(new Error(sanitizeOutput(stderr) || `sqlmap command failed with exit code ${code}.`));
    });
  });
}

function sanitizeOutput(value: string) {
  return value.replace(/(Authorization:\s*)([^\r\n]+)/gi, "$1<redacted>");
}

function safeNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(max, Math.max(min, Math.trunc(parsed))));
}
