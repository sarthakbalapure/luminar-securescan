import { z } from "zod";

export * from "./domain";
export * from "./openapi";

export type ScoreSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export function calculateSecurityScore(counts: Partial<Record<ScoreSeverity, number>>) {
  const score = 100 -
    (counts.CRITICAL ?? 0) * 25 -
    (counts.HIGH ?? 0) * 12 -
    (counts.MEDIUM ?? 0) * 6 -
    (counts.LOW ?? 0) * 2 -
    (counts.INFO ?? 0) * 0.5;
  return Math.max(0, Math.round(score * 10) / 10);
}

export function riskRatingForScore(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Poor";
  return "Critical";
}

export const severityLevels = ["Critical", "High", "Medium", "Low", "Info"] as const;
export type Severity = (typeof severityLevels)[number];

export const findingStatuses = [
  "Open",
  "In Progress",
  "Risk Accepted",
  "False Positive",
  "Fixed",
  "Retest Required"
] as const;
export type FindingStatus = (typeof findingStatuses)[number];

export const scanStatuses = ["Queued", "Running", "Completed", "Failed", "Cancelled"] as const;
export type ScanStatus = (typeof scanStatuses)[number];

export const assetTypeSchema = z.enum(["Website", "WebApplication", "API"]);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const registerAssetSchema = z.object({
  projectId: z.string().uuid(),
  type: assetTypeSchema,
  name: z.string().trim().min(2).max(120),
  url: z.string().url(),
  authorizationConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm authorization before registering this asset." })
  })
});
export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;

export const startScanSchema = z.object({
  assetId: z.string().uuid(),
  authorizationConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Authorized defensive testing confirmation is required." })
  }),
  checks: z.array(z.enum(["HTTPS", "TLS", "SecurityHeaders", "Cookies", "ExposedFiles", "PassivePlaceholder"])).min(1)
});
export type StartScanInput = z.infer<typeof startScanSchema>;

export type FindingTemplate = {
  ruleId: string;
  title: string;
  defaultSeverity: Severity;
  owaspTop10?: string;
  owaspAsvs?: string;
  cwe?: string;
  businessImpact: string;
  technicalExplanation: string;
  remediation: string;
  retestGuidance: string;
};

export const findingTemplates: Record<string, FindingTemplate> = {
  HTTPS_NOT_ENFORCED: {
    ruleId: "HTTPS_NOT_ENFORCED",
    title: "HTTPS is not enforced",
    defaultSeverity: "High",
    owaspTop10: "A02:2021 - Cryptographic Failures",
    owaspAsvs: "V9 - Communications",
    cwe: "CWE-319",
    businessImpact:
      "Users and business workflows may be exposed to interception, session theft, or content tampering.",
    technicalExplanation:
      "The asset did not present a reliable HTTPS endpoint or allowed plaintext access for security-sensitive traffic.",
    remediation:
      "Enable HTTPS for all application routes, redirect HTTP to HTTPS, renew certificates automatically, and enable HSTS after validation.",
    retestGuidance:
      "Run a new HTTPS and TLS scan after deployment and verify that HTTP requests are redirected to HTTPS."
  },
  MISSING_SECURITY_HEADER: {
    ruleId: "MISSING_SECURITY_HEADER",
    title: "Recommended security header is missing",
    defaultSeverity: "Medium",
    owaspTop10: "A05:2021 - Security Misconfiguration",
    owaspAsvs: "V14 - Configuration",
    cwe: "CWE-693",
    businessImpact:
      "Missing browser protections can increase the impact of cross-site scripting, clickjacking, and data leakage.",
    technicalExplanation:
      "One or more recommended response headers were absent from the checked endpoint.",
    remediation:
      "Add a reviewed header policy for Content-Security-Policy, X-Frame-Options or frame-ancestors, Referrer-Policy, and related controls.",
    retestGuidance:
      "Retest the affected URL and confirm the expected header is present with a production-safe value."
  },
  INSECURE_COOKIE: {
    ruleId: "INSECURE_COOKIE",
    title: "Cookie is missing security attributes",
    defaultSeverity: "Medium",
    owaspTop10: "A01:2021 - Broken Access Control",
    owaspAsvs: "V3 - Session Management",
    cwe: "CWE-614",
    businessImpact:
      "Session or preference cookies may be exposed to theft, tampering, or unintended cross-site transmission.",
    technicalExplanation:
      "A Set-Cookie header was missing Secure, HttpOnly, or an appropriate SameSite attribute.",
    remediation:
      "Set Secure and HttpOnly for session cookies and choose SameSite=Lax or Strict unless a specific integration requires None with Secure.",
    retestGuidance:
      "Authenticate or visit the workflow that sets the cookie and verify all required cookie attributes are present."
  },
  EXPOSED_SENSITIVE_FILE: {
    ruleId: "EXPOSED_SENSITIVE_FILE",
    title: "Potentially sensitive file is publicly accessible",
    defaultSeverity: "High",
    owaspTop10: "A05:2021 - Security Misconfiguration",
    owaspAsvs: "V14 - Configuration",
    cwe: "CWE-538",
    businessImpact:
      "Publicly exposed operational files may reveal deployment details, secrets, or internal application structure.",
    technicalExplanation:
      "A common sensitive path responded as accessible during the defensive check.",
    remediation:
      "Remove the file from the public web root, deny access at the web server layer, and rotate any exposed credentials.",
    retestGuidance:
      "Retest the exact path and confirm it returns 403 or 404 without disclosing file contents."
  }
};

export function getTemplate(ruleId: string): FindingTemplate {
  return findingTemplates[ruleId] ?? {
    ruleId,
    title: "Security observation",
    defaultSeverity: "Info",
    businessImpact: "The observation may affect the asset security posture and should be reviewed.",
    technicalExplanation: "The scanner recorded a security-relevant condition.",
    remediation: "Review the evidence and apply the appropriate secure configuration.",
    retestGuidance: "Run a retest after remediation and compare the new evidence."
  };
}
