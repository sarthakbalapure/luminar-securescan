import { execFile as execFileCallback, type ExecFileOptions } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, dirname, join, relative } from "path";
import { promisify } from "util";
import { makeFinding } from "../finding-factory";
import type { NormalizedFinding, ScannerContext, ScannerModule } from "../types";

const execFile = promisify(execFileCallback);
const maxFileBytes = Number(process.env.REPO_SCAN_MAX_FILE_BYTES ?? 1024 * 1024);
const maxFiles = Number(process.env.REPO_SCAN_MAX_FILES ?? 5000);
const maxZipBytes = Number(process.env.REPO_ZIP_MAX_BYTES ?? 10 * 1024 * 1024);
const commandTimeoutMs = Number(process.env.REPO_TOOL_TIMEOUT_MS ?? 60_000);

export type CommandRunner = (file: string, args: string[], options?: ExecFileOptions) => Promise<{ stdout: string; stderr: string }>;

export const repositorySecurityScan: ScannerModule = {
  jobType: "REPOSITORY_SECURITY_SCAN",
  async run(target: string, context?: ScannerContext) {
    return runRepositorySecurityScan(target, context);
  },
};

export async function runRepositorySecurityScan(target: string, context?: ScannerContext, runner: CommandRunner = runCommand) {
  const workspace = await mkdtemp(join(tmpdir(), "luminar-repo-scan-"));
  try {
    const sourceDir = await prepareRepositorySource(workspace, target, context, runner);
    const files = await listRepositoryFiles(sourceDir);
    const findings = [
      ...await runGitleaks(sourceDir, target, runner),
      ...await runSemgrep(sourceDir, target, runner),
      ...await runTrivy(sourceDir, target, runner),
      ...await runDependencyAudit(sourceDir, target, runner),
      ...await runBuiltInRepositoryChecks(sourceDir, target, files),
    ];
    return dedupeRepositoryFindings(findings);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export function parseGitleaksOutput(output: string, target: string): NormalizedFinding[] {
  const parsed = parseJson<Array<Record<string, unknown>>>(output, []);
  return parsed.map((item) => repoFinding({
    title: `Hardcoded secret detected: ${stringValue(item.RuleID) || "secret pattern"}`,
    severity: "HIGH",
    affectedUrl: repoLocation(target, stringValue(item.File), numberValue(item.StartLine)),
    evidenceSummary: `${stringValue(item.Description) || "Secret-like value detected"} in ${stringValue(item.File) || "repository file"}: ${redactSecret(stringValue(item.Secret) || stringValue(item.Match) || "")}`,
    remediationSummary: "Remove the secret from source control, rotate the credential, and use a managed secret store or CI secret variable.",
    technicalImpact: "Hardcoded credentials can be recovered from repository history and used outside intended trust boundaries.",
    raw: { tool: "gitleaks", finding: redactObject(item) },
  }));
}

export function parseSemgrepOutput(output: string, target: string): NormalizedFinding[] {
  const parsed = parseJson<{ results?: Array<Record<string, unknown>> }>(output, {});
  return (parsed.results ?? []).map((item) => {
    const extra = objectValue(item.extra);
    return repoFinding({
      title: `Static code issue: ${stringValue(item.check_id) || stringValue(extra.message) || "Semgrep finding"}`,
      severity: semgrepSeverity(extra.severity),
      affectedUrl: repoLocation(target, stringValue(item.path), numberValue(item.start && objectValue(item.start).line)),
      evidenceSummary: redactSecret(stringValue(extra.message) || "Semgrep reported a static code issue."),
      remediationSummary: "Review the affected code path and apply the defensive fix recommended by the rule.",
      technicalImpact: "Static analysis identified code that may weaken the repository security posture.",
      raw: { tool: "semgrep", finding: redactObject(item) },
    });
  });
}

export function parseTrivyOutput(output: string, target: string): NormalizedFinding[] {
  const parsed = parseJson<{ Results?: Array<Record<string, unknown>> }>(output, {});
  return (parsed.Results ?? []).flatMap((result) => {
    const targetName = stringValue(result.Target);
    const misconfigurations = arrayValue(result.Misconfigurations).map((item) => repoFinding({
      title: `Dockerfile/config security issue: ${stringValue(item.ID) || stringValue(item.Title) || "Trivy misconfiguration"}`,
      severity: trivySeverity(item.Severity),
      affectedUrl: repoLocation(target, targetName),
      evidenceSummary: redactSecret(stringValue(item.Message) || stringValue(item.Description) || "Trivy reported a configuration issue."),
      remediationSummary: stringValue(item.Resolution) || "Update the container or infrastructure configuration to follow least-privilege security guidance.",
      technicalImpact: "Container or infrastructure configuration may weaken runtime isolation or deployment security.",
      raw: { tool: "trivy", finding: redactObject(item) },
    }));
    const vulnerabilities = arrayValue(result.Vulnerabilities).map((item) => repoFinding({
      title: `Dependency vulnerability: ${stringValue(item.VulnerabilityID) || stringValue(item.PkgName) || "vulnerable package"}`,
      severity: trivySeverity(item.Severity),
      affectedUrl: repoLocation(target, targetName),
      evidenceSummary: `${stringValue(item.PkgName)} ${stringValue(item.InstalledVersion)}: ${redactSecret(stringValue(item.Title) || "")}`,
      remediationSummary: stringValue(item.FixedVersion) ? `Upgrade to fixed version ${stringValue(item.FixedVersion)} or later.` : "Upgrade or replace the affected dependency after validating compatibility.",
      technicalImpact: "A dependency or container package has a known vulnerability indicator.",
      raw: { tool: "trivy", finding: redactObject(item) },
    }));
    return [...misconfigurations, ...vulnerabilities];
  });
}

export function parseNpmAuditOutput(output: string, target: string): NormalizedFinding[] {
  const parsed = parseJson<{ vulnerabilities?: Record<string, Record<string, unknown>> }>(output, {});
  return Object.entries(parsed.vulnerabilities ?? {}).map(([name, item]) => repoFinding({
    title: `Dependency vulnerability: ${name}`,
    severity: npmAuditSeverity(item.severity),
    affectedUrl: repoLocation(target, stringValue(item.name) || "package.json"),
    evidenceSummary: `${name}: ${redactSecret(stringValue(item.title) || stringValue(item.via) || "npm audit vulnerability")}`,
    remediationSummary: item.fixAvailable ? "Apply the available package manager fix and rerun dependency tests." : "Upgrade or replace the dependency after reviewing the advisory.",
    technicalImpact: "A package manager audit reported a vulnerable dependency.",
    raw: { tool: "npm-audit", finding: redactObject(item) },
  }));
}

export function redactSecret(value: string) {
  return value
    .replace(/([A-Za-z0-9_=-]{4})[A-Za-z0-9_./+=-]{8,}([A-Za-z0-9_=-]{4})/g, "$1...REDACTED...$2")
    .replace(/(password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=<redacted>");
}

async function prepareRepositorySource(workspace: string, target: string, context: ScannerContext | undefined, runner: CommandRunner) {
  if (context?.repositoryZipBase64) {
    const zip = Buffer.from(context.repositoryZipBase64, "base64");
    if (zip.byteLength > maxZipBytes) throw new Error("Repository ZIP upload exceeds the configured size limit.");
    const zipPath = join(workspace, "upload.zip");
    const extractDir = join(workspace, "source");
    await writeFile(zipPath, zip);
    await mkdir(extractDir, { recursive: true });
    await runner("tar", ["-xf", zipPath, "-C", extractDir], { timeout: commandTimeoutMs });
    return extractDir;
  }

  const repoUrl = validateGitHubRepositoryUrl(target);
  const cloneDir = join(workspace, "source");
  const args = ["clone", "--depth", "1"];
  if (context?.repositoryBranch) args.push("--branch", context.repositoryBranch);
  args.push(repoUrl.toString(), cloneDir);
  const env = context?.repositoryToken ? githubTokenEnv(context.repositoryToken, process.env) : process.env;
  await runner("git", args, { timeout: commandTimeoutMs, env });
  return cloneDir;
}

async function runGitleaks(sourceDir: string, target: string, runner: CommandRunner) {
  const reportPath = join(dirname(sourceDir), `gitleaks-${randomUUID()}.json`);
  const result = await runOptionalTool(runner, "gitleaks", ["detect", "--source", sourceDir, "--report-format", "json", "--report-path", reportPath, "--no-banner"]);
  const output = existsSync(reportPath) ? await readFile(reportPath, "utf8") : result.stdout;
  return parseGitleaksOutput(output || "[]", target);
}

async function runSemgrep(sourceDir: string, target: string, runner: CommandRunner) {
  const result = await runOptionalTool(runner, "semgrep", ["scan", "--json", "--config", "auto", sourceDir]);
  return parseSemgrepOutput(result.stdout || "{}", target);
}

async function runTrivy(sourceDir: string, target: string, runner: CommandRunner) {
  const result = await runOptionalTool(runner, "trivy", ["config", "--format", "json", sourceDir]);
  return parseTrivyOutput(result.stdout || "{}", target);
}

async function runDependencyAudit(sourceDir: string, target: string, runner: CommandRunner) {
  if (!existsSync(join(sourceDir, "package-lock.json"))) return [];
  const result = await runOptionalTool(runner, "npm", ["audit", "--json", "--omit", "dev"], { cwd: sourceDir });
  return parseNpmAuditOutput(result.stdout || "{}", target);
}

async function runOptionalTool(runner: CommandRunner, file: string, args: string[], options: ExecFileOptions = {}) {
  try {
    return await runner(file, args, { timeout: commandTimeoutMs, ...options });
  } catch (error) {
    const maybeOutput = error as { stdout?: string; stderr?: string; code?: string };
    if (maybeOutput.stdout) return { stdout: maybeOutput.stdout, stderr: maybeOutput.stderr ?? "" };
    if (maybeOutput.code === "ENOENT") return { stdout: "", stderr: "" };
    return { stdout: "", stderr: maybeOutput.stderr ?? "" };
  }
}

async function runBuiltInRepositoryChecks(sourceDir: string, target: string, files: string[]) {
  const findings: NormalizedFinding[] = [];
  for (const file of files) {
    const relativePath = relative(sourceDir, file).replace(/\\/g, "/");
    const content = await readFile(file, "utf8").catch(() => "");
    if (/(^|\/)\.env(\.|$)|\.env$/.test(relativePath)) {
      findings.push(repoFinding({
        title: "Environment file is present in repository scan scope",
        severity: "HIGH",
        affectedUrl: repoLocation(target, relativePath),
        evidenceSummary: `${relativePath} contains environment-style configuration. Sample keys: ${redactSecret(sampleEnvKeys(content))}`,
        remediationSummary: "Remove environment files from source control, rotate any exposed values, and commit only safe templates such as .env.example.",
        technicalImpact: "Environment files commonly contain credentials or deployment details.",
        raw: { scanner: "built-in", file: relativePath },
      }));
    }
    if (weakCryptoPattern(content)) {
      findings.push(repoFinding({
        title: "Weak crypto pattern detected",
        severity: "MEDIUM",
        affectedUrl: repoLocation(target, relativePath),
        evidenceSummary: `${relativePath} references weak cryptographic primitives or hash algorithms.`,
        remediationSummary: "Replace weak primitives such as MD5, SHA-1, DES, or RC4 with modern approved algorithms and review compatibility.",
        technicalImpact: "Weak cryptography can reduce confidentiality, integrity, or password/hash resistance.",
        raw: { scanner: "built-in", file: relativePath },
      }));
    }
    if (insecureConfigPattern(relativePath, content)) {
      findings.push(repoFinding({
        title: "Insecure configuration pattern detected",
        severity: "MEDIUM",
        affectedUrl: repoLocation(target, relativePath),
        evidenceSummary: `${relativePath} contains an insecure configuration indicator with values redacted.`,
        remediationSummary: "Review the configuration and disable debug, permissive TLS, wildcard CORS, or privileged container settings before deployment.",
        technicalImpact: "Insecure defaults can weaken runtime security controls.",
        raw: { scanner: "built-in", file: relativePath },
      }));
    }
    if (ciSecretLeakPattern(relativePath, content)) {
      findings.push(repoFinding({
        title: "CI/CD workflow secret leakage pattern detected",
        severity: "HIGH",
        affectedUrl: repoLocation(target, relativePath),
        evidenceSummary: `${relativePath} appears to echo or print secret-like values. Evidence is redacted.`,
        remediationSummary: "Remove secret printing, use masked CI secret variables, and rotate any exposed credentials.",
        technicalImpact: "CI logs can persist sensitive values and expose them to users with build-log access.",
        raw: { scanner: "built-in", file: relativePath },
      }));
    }
  }
  return findings;
}

async function listRepositoryFiles(sourceDir: string) {
  const files: string[] = [];
  async function visit(dir: string) {
    if (files.length >= maxFiles) return;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (entry.isFile()) {
        const info = await stat(fullPath).catch(() => null);
        if (info && info.size <= maxFileBytes) files.push(fullPath);
      }
    }
  }
  await visit(sourceDir);
  return files;
}

function repoFinding(input: {
  title: string;
  severity: NormalizedFinding["severity"];
  affectedUrl: string;
  evidenceSummary: string;
  remediationSummary: string;
  technicalImpact: string;
  raw: object;
}) {
  return makeFinding({
    title: input.title,
    description: input.technicalImpact,
    severity: input.severity,
    category: "Repository Security",
    affectedUrl: input.affectedUrl,
    evidenceSummary: redactSecret(input.evidenceSummary),
    businessImpact: "Repository security findings can expose credentials, weaken application defenses, or introduce vulnerable code into production.",
    technicalImpact: input.technicalImpact,
    remediationSummary: input.remediationSummary,
    retestSteps: "Rerun the repository scan after removing the issue and rotating any potentially exposed secret.",
    owaspMapping: ["Software and Data Integrity Failures", "Security Misconfiguration"],
    evidenceType: "REPOSITORY_SCAN",
    observedValue: redactSecret(input.evidenceSummary),
    expectedValue: "No repository security issue detected",
    rawJson: input.raw,
    recommendationType: "REPOSITORY_SECURITY",
  });
}

function validateGitHubRepositoryUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Repository scans currently require an HTTPS GitHub repository URL.");
  }
  const parts = url.pathname.replace(/^\/|\.git$/g, "").split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error("GitHub repository URL must include owner and repository.");
  return new URL(`https://github.com/${parts[0]}/${parts[1]}.git`);
}

function githubTokenEnv(token: string, env: NodeJS.ProcessEnv) {
  return {
    ...env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Bearer ${token}`,
  };
}

async function runCommand(file: string, args: string[], options?: ExecFileOptions) {
  const result = await execFile(file, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024, encoding: "utf8", ...options });
  return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
}

function semgrepSeverity(value: unknown): NormalizedFinding["severity"] {
  const normalized = stringValue(value).toLowerCase();
  if (normalized.includes("error") || normalized.includes("high")) return "HIGH";
  if (normalized.includes("warning") || normalized.includes("medium")) return "MEDIUM";
  if (normalized.includes("info")) return "LOW";
  return "INFO";
}

function trivySeverity(value: unknown): NormalizedFinding["severity"] {
  const normalized = stringValue(value).toLowerCase();
  if (normalized.includes("critical")) return "CRITICAL";
  if (normalized.includes("high")) return "HIGH";
  if (normalized.includes("medium")) return "MEDIUM";
  if (normalized.includes("low")) return "LOW";
  return "INFO";
}

function npmAuditSeverity(value: unknown): NormalizedFinding["severity"] {
  const normalized = stringValue(value).toLowerCase();
  if (normalized.includes("critical")) return "CRITICAL";
  if (normalized.includes("high")) return "HIGH";
  if (normalized.includes("moderate")) return "MEDIUM";
  if (normalized.includes("low")) return "LOW";
  return "INFO";
}

function weakCryptoPattern(content: string) {
  return /\b(md5|sha1|des|rc4|createHash\(["']sha1|createHash\(["']md5)\b/i.test(content);
}

function insecureConfigPattern(path: string, content: string) {
  return (/(^|\/)Dockerfile$/i.test(path) || /\.(ya?ml|json|toml|ini|conf|config)$/i.test(path)) &&
    /(debug\s*[:=]\s*true|verify_ssl\s*[:=]\s*false|rejectUnauthorized\s*[:=]\s*false|Access-Control-Allow-Origin\s*[:=]\s*\*|privileged\s*[:=]\s*true)/i.test(content);
}

function ciSecretLeakPattern(path: string, content: string) {
  return /(^|\/)\.github\/workflows\/.+\.ya?ml$/i.test(path) &&
    /(echo|printf|Write-Host).*(secret|token|password|api[_-]?key)/i.test(content);
}

function sampleEnvKeys(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.split("=")[0]?.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
}

function repoLocation(target: string, file?: string, line?: number) {
  const suffix = file ? `#${file}${line ? `:${line}` : ""}` : "";
  return `${target}${suffix}`;
}

function dedupeRepositoryFindings(findings: NormalizedFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.title}|${finding.evidence?.url ?? ""}|${finding.evidenceSummary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function redactObject<T>(value: T): T {
  return JSON.parse(redactSecret(JSON.stringify(value))) as T;
}
