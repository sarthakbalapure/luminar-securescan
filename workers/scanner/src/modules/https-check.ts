import { getTemplate } from "@luminar-iq/shared";
import { makeFinding } from "../finding-factory";
import { requestUrl } from "../http-client";
import { assertAllowedTarget } from "../scanner-core";
import type { NormalizedFinding, ScannerModule } from "../types";

export const httpsCheck: ScannerModule = {
  jobType: "HTTPS_CHECK",
  async run(target: string): Promise<NormalizedFinding[]> {
    const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    if (url.protocol === "https:") return [];

    let redirectEvidence = "HTTP endpoint did not redirect to HTTPS.";
    try {
      const response = await requestUrl(target, { method: "HEAD", maxRedirects: 0, maxBodyBytes: 0 });
      const location = response.redirectedTo ?? response.headers.get("location");
      if (location && new URL(location, target).protocol === "https:") {
        redirectEvidence = `HTTP endpoint redirects to HTTPS: ${new URL(location, target).toString()}`;
      }
    } catch (error) {
      redirectEvidence = `HTTP redirect check failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }

    const template = getTemplate("HTTPS_NOT_ENFORCED");
    return [makeFinding({
      title: template.title,
      description: template.technicalExplanation,
      severity: "HIGH",
      category: "Transport Security",
      affectedUrl: target,
      evidenceSummary: `Asset uses HTTP instead of HTTPS. ${redirectEvidence}`,
      businessImpact: template.businessImpact,
      technicalImpact: template.technicalExplanation,
      remediationSummary: template.remediation,
      retestSteps: template.retestGuidance,
      cwe: template.cwe,
      owaspMapping: template.owaspTop10 ? [template.owaspTop10] : [],
      evidenceType: "URL_SCHEME",
      observedValue: url.protocol,
      expectedValue: "https:",
      recommendationType: "TRANSPORT_SECURITY",
    })];
  },
};
