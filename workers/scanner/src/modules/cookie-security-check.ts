import { getTemplate } from "@luminar-iq/shared";
import { makeFinding, severityToUpper } from "../finding-factory";
import { requestUrl } from "../http-client";
import { analyzeCookies, assertAllowedTarget } from "../scanner-core";
import type { NormalizedFinding, ScannerModule } from "../types";

export const cookieSecurityCheck: ScannerModule = {
  jobType: "COOKIE_SECURITY_CHECK",
  async run(target: string): Promise<NormalizedFinding[]> {
    const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    const response = await requestUrl(target, { method: "GET", maxBodyBytes: 2048 });
    const raw = collectSetCookieHeaders(response.headers);
    const findings = analyzeCookies(raw).filter((finding) => {
      if (finding.title.toLowerCase().includes("missing secure")) return url.protocol === "https:";
      return true;
    });
    const template = getTemplate("INSECURE_COOKIE");
    return findings.map((finding) => makeFinding({
      title: finding.title,
      description: template.technicalExplanation,
      severity: severityToUpper(finding.severity),
      category: finding.category ?? "Cookie Security",
      affectedUrl: response.url,
      evidenceSummary: finding.evidence,
      businessImpact: template.businessImpact,
      technicalImpact: template.technicalExplanation,
      remediationSummary: finding.recommendation,
      retestSteps: template.retestGuidance,
      cwe: template.cwe,
      owaspMapping: template.owaspTop10 ? [template.owaspTop10] : [],
      evidenceType: "SET_COOKIE",
      responseSummary: `HTTP ${response.status}`,
      expectedValue: "Secure, HttpOnly, SameSite, and minimal lifetime attributes",
      recommendationType: "SESSION_CONFIGURATION",
    }));
  },
};

function collectSetCookieHeaders(headers: Headers): string[] {
  const maybeGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const values = maybeGetSetCookie.getSetCookie?.();
  if (values?.length) return values;
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}
