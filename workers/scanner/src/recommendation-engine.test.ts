import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_GUARDRAILS,
  generateTemplateRecommendation,
  PlaceholderAiRecommendationProvider,
  RecommendationEngine,
  type FindingContext,
} from "./recommendation-engine";

const baseContext: FindingContext = {
  scannerName: "test",
  title: "Finding",
  category: "Security Misconfiguration",
  severity: "MEDIUM",
  affectedUrl: "https://example.com",
  evidenceSummary: "Observed scanner evidence.",
};

const cases: Array<{ title: string; category?: string; evidence: string; expectedType: string }> = [
  {
    title: "HTTPS is not enforced",
    category: "Transport Security",
    evidence: "Asset uses HTTP instead of HTTPS.",
    expectedType: "MISSING_HTTPS",
  },
  {
    title: "HTTP does not redirect to HTTPS",
    category: "Transport Security",
    evidence: "HTTP endpoint did not redirect to HTTPS.",
    expectedType: "HTTP_NO_HTTPS_REDIRECT",
  },
  {
    title: "TLS certificate is expired",
    category: "TLS",
    evidence: "Certificate expired on Jan 1.",
    expectedType: "EXPIRED_TLS_CERTIFICATE",
  },
  {
    title: "TLS certificate expires soon",
    category: "TLS",
    evidence: "Certificate expires in 10 days.",
    expectedType: "TLS_CERTIFICATE_EXPIRING_SOON",
  },
  {
    title: "HTTP Strict Transport Security header is missing",
    category: "Security Headers",
    evidence: "Missing response header: strict-transport-security",
    expectedType: "MISSING_HSTS",
  },
  {
    title: "Content Security Policy header is missing",
    category: "Security Headers",
    evidence: "Missing response header: content-security-policy",
    expectedType: "MISSING_CONTENT_SECURITY_POLICY",
  },
  {
    title: "Clickjacking protection is not explicitly configured",
    category: "Security Headers",
    evidence: "Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.",
    expectedType: "MISSING_FRAME_PROTECTION",
  },
  {
    title: "X-Content-Type-Options header is missing",
    category: "Security Headers",
    evidence: "Missing response header: x-content-type-options",
    expectedType: "MISSING_X_CONTENT_TYPE_OPTIONS",
  },
  {
    title: "Referrer Policy header is missing",
    category: "Security Headers",
    evidence: "Missing response header: referrer-policy",
    expectedType: "MISSING_REFERRER_POLICY",
  },
  {
    title: "Permissions Policy header is missing",
    category: "Security Headers",
    evidence: "Missing response header: permissions-policy",
    expectedType: "MISSING_PERMISSIONS_POLICY",
  },
  {
    title: "Cookie session is missing secure",
    category: "Cookie Security",
    evidence: "Set-Cookie is missing secure.",
    expectedType: "COOKIE_MISSING_SECURE",
  },
  {
    title: "Cookie session is missing httponly",
    category: "Cookie Security",
    evidence: "Set-Cookie is missing httponly.",
    expectedType: "COOKIE_MISSING_HTTPONLY",
  },
  {
    title: "Cookie session is missing samesite",
    category: "Cookie Security",
    evidence: "Set-Cookie is missing samesite.",
    expectedType: "COOKIE_MISSING_SAMESITE",
  },
  {
    title: "Potentially sensitive public file is accessible: /.env",
    category: "Exposed Files",
    evidence: "/.env returned HTTP 200.",
    expectedType: "EXPOSED_ENV_FILE",
  },
  {
    title: "Potentially sensitive public file is accessible: /.git/config",
    category: "Exposed Files",
    evidence: "/.git/config returned HTTP 200.",
    expectedType: "EXPOSED_GIT_DIRECTORY",
  },
  {
    title: "Potentially sensitive public file is accessible: /backup.zip",
    category: "Exposed Files",
    evidence: "/backup.zip returned HTTP 200.",
    expectedType: "EXPOSED_BACKUP_FILE",
  },
  {
    title: "Potentially sensitive public file is accessible: /server-status",
    category: "Exposed Files",
    evidence: "/server-status returned HTTP 200.",
    expectedType: "SERVER_INFORMATION_DISCLOSURE",
  },
  {
    title: "Potentially sensitive public file is accessible: /robots.txt",
    category: "Exposed Files",
    evidence: "robots.txt references admin and backup paths.",
    expectedType: "ROBOTS_TXT_SENSITIVE_PATHS",
  },
];

describe("recommendation engine", () => {
  it.each(cases)("generates a developer-ready template for $expectedType", ({ title, category, evidence, expectedType }) => {
    const recommendation = generateTemplateRecommendation({
      ...baseContext,
      title,
      category: category ?? baseContext.category,
      evidenceSummary: evidence,
      affectedUrl: title.includes("HTTP does not redirect") ? "http://example.com" : baseContext.affectedUrl,
    });

    expect(recommendation.recommendationType).toBe(expectedType);
    expect(recommendation.plainEnglishExplanation).toBeTruthy();
    expect(recommendation.businessImpact).toBeTruthy();
    expect(recommendation.technicalImpact).toBeTruthy();
    expect(recommendation.recommendedFix).toBeTruthy();
    expect(recommendation.codeExample).toContain("```");
    expect(recommendation.retestSteps).toBeTruthy();
    expect(recommendation.priorityGuidance).toBeTruthy();
    expect(recommendation.confidence).toBe("HIGH");
    expect(recommendation.evidenceCitations).toContain(`Scanner evidence: ${evidence}`);
    expect(recommendation.evidenceCitations).toContain(`Affected URL: ${recommendation.evidenceCitations[1].replace("Affected URL: ", "")}`);
    expect(recommendation.remediationText).toContain("Confidence: HIGH");
  });

  it("exposes guardrails for future AI providers", () => {
    expect(AI_PROVIDER_GUARDRAILS).toContain("Do not provide offensive exploitation instructions.");
    expect(AI_PROVIDER_GUARDRAILS).toContain("Only provide defensive remediation.");
    expect(AI_PROVIDER_GUARDRAILS).toContain("Cite scanner evidence.");
  });

  it("keeps the AI provider placeholder deterministic", async () => {
    const provider = new PlaceholderAiRecommendationProvider();
    const recommendation = await provider.generateRecommendation({
      ...baseContext,
      title: "Cookie session is missing secure",
      category: "Cookie Security",
      evidenceSummary: "Set-Cookie is missing secure.",
    });

    expect(recommendation.recommendationType).toBe("COOKIE_MISSING_SECURE");
    expect(recommendation.confidence).toBe("MEDIUM");
  });

  it("can be constructed in template and AI placeholder modes", async () => {
    const templateEngine = RecommendationEngine.template();
    const aiPlaceholderEngine = RecommendationEngine.aiProviderPlaceholder();

    await expect(templateEngine.generateRecommendation(baseContext)).resolves.toMatchObject({
      recommendationType: "GENERAL_REMEDIATION",
    });
    await expect(aiPlaceholderEngine.generateRecommendation(baseContext)).resolves.toMatchObject({
      recommendationType: "GENERAL_REMEDIATION",
      confidence: "MEDIUM",
    });
  });
});
