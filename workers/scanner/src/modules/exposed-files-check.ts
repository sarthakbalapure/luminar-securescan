import { getTemplate } from "@luminar-iq/shared";
import { makeFinding } from "../finding-factory";
import { requestUrl } from "../http-client";
import { assertAllowedTarget, buildSensitiveFileUrls } from "../scanner-core";
import type { NormalizedFinding, ScannerModule } from "../types";

const criticalPaths = new Set(["/.env", "/.git/config"]);
const highPaths = new Set(["/backup.zip", "/db.sql", "/phpinfo.php"]);
const validationBodyBytes = 2048;

export const exposedFilesCheck: ScannerModule = {
  jobType: "EXPOSED_FILES_CHECK",
  async run(target: string): Promise<NormalizedFinding[]> {
    assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    const template = getTemplate("EXPOSED_SENSITIVE_FILE");
    const findings: NormalizedFinding[] = [];

    for (const url of buildSensitiveFileUrls(target)) {
      const path = new URL(url).pathname;
      let response = await requestUrl(url, { method: "HEAD", maxBodyBytes: 0, maxRedirects: 0 });
      if ([405, 501, 403].includes(response.status) && path !== "/backup.zip" && path !== "/db.sql") {
        response = await requestUrl(url, { method: "GET", maxBodyBytes: validationBodyBytes, maxRedirects: 0 });
      }

      if (!isExposed(path, response.status, response.bodySnippet)) continue;

      const severity = criticalPaths.has(path) ? "CRITICAL" : highPaths.has(path) ? "HIGH" : "LOW";
      findings.push(makeFinding({
        title: `Potentially sensitive public file is accessible: ${path}`,
        description: template.technicalExplanation,
        severity,
        category: "Exposed Files",
        affectedUrl: url,
        evidenceSummary: `${url} returned HTTP ${response.status}${response.truncated ? " with a truncated response sample" : ""}.`,
        businessImpact: template.businessImpact,
        technicalImpact: template.technicalExplanation,
        remediationSummary: template.remediation,
        retestSteps: template.retestGuidance,
        cwe: template.cwe,
        owaspMapping: template.owaspTop10 ? [template.owaspTop10] : [],
        evidenceType: "HTTP_STATUS",
        responseSummary: `HTTP ${response.status}`,
        observedValue: response.bodySnippet ? response.bodySnippet.slice(0, 300) : String(response.status),
        expectedValue: "403 or 404 without sensitive content",
        rawJson: { path, truncated: response.truncated, bodySampleBytes: response.bodySnippet.length },
        recommendationType: "SERVER_CONFIGURATION",
      }));
    }

    return findings;
  },
};

function isExposed(path: string, status: number, bodySnippet: string) {
  if (status < 200 || status >= 300) return false;
  if (path === "/robots.txt" || path === "/sitemap.xml") return looksSensitive(bodySnippet);
  if (path === "/server-status") return /server uptime|apache server status|requests\/sec/i.test(bodySnippet) || status === 200;
  if (path === "/.env") return /(?:^|\n)\s*[A-Z0-9_]{3,}\s*=/i.test(bodySnippet) || status === 200;
  if (path === "/.git/config") return /\[core\]|\[remote "/i.test(bodySnippet) || status === 200;
  if (path === "/phpinfo.php") return /phpinfo\(\)|php version|configuration/i.test(bodySnippet) || status === 200;
  return true;
}

function looksSensitive(bodySnippet: string) {
  return /(admin|staging|backup|\.env|\.git|token|secret|db\.sql|private)/i.test(bodySnippet);
}
