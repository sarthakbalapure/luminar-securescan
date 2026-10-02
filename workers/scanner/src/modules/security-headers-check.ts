import { getTemplate } from "@luminar-iq/shared";
import { makeFinding, severityToUpper } from "../finding-factory";
import { requestUrl } from "../http-client";
import { analyzeHeaders, assertAllowedTarget } from "../scanner-core";
import type { NormalizedFinding, ScannerModule } from "../types";

export const securityHeadersCheck: ScannerModule = {
  jobType: "SECURITY_HEADERS_CHECK",
  async run(target: string): Promise<NormalizedFinding[]> {
    assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    const response = await requestUrl(target, { method: "GET", maxBodyBytes: 2048 });
    const findings = await analyzeHeaders(response.url, response.headers);
    const template = getTemplate("MISSING_SECURITY_HEADER");
    return findings.map((finding) => makeFinding({
      title: finding.title,
      description: template.technicalExplanation,
      severity: severityToUpper(finding.severity),
      category: finding.category ?? "Security Headers",
      affectedUrl: finding.affectedUrl ?? response.url,
      evidenceSummary: finding.evidence,
      businessImpact: template.businessImpact,
      technicalImpact: template.technicalExplanation,
      remediationSummary: finding.recommendation,
      retestSteps: template.retestGuidance,
      cwe: template.cwe,
      owaspMapping: template.owaspTop10 ? [template.owaspTop10] : [],
      evidenceType: "RESPONSE_HEADER",
      responseSummary: `HTTP ${response.status}`,
      expectedValue: "Secure browser response header present with production-safe value",
      recommendationType: "CONFIGURATION",
    }));
  },
};
