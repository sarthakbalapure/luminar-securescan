import { ProtectedShell } from "../../../components/protected-shell";
import { Card } from "../../../components/ui";

const content: Record<string, { title: string; body: string[] }> = {
  "getting-started": {
    title: "Getting Started",
    body: ["Create an account, register an organization, add a project, and add a website asset.", "Before every scan, confirm that you own the asset or have explicit authorization to test it."],
  },
  "security-score": {
    title: "Security Score",
    body: ["Scores start at 100. Critical findings deduct 25, High 12, Medium 6, Low 2, and Info 0.5.", "Ratings are Excellent, Good, Moderate, Poor, and Critical."],
  },
  "severity-levels": {
    title: "Severity Levels",
    body: ["Critical and High findings should be prioritized first.", "Medium and Low findings are hardening items that reduce attack surface."],
  },
  remediation: {
    title: "Remediation",
    body: ["Each finding includes technical impact, business impact, recommended fix, code/config examples, and retest steps.", "Validate changes in staging before rolling out to production."],
  },
  reports: {
    title: "Reports",
    body: ["Generate executive, technical, or full reports from completed scans.", "Reports include evidence, severity summaries, top risks, and the authorized scanning disclaimer."],
  },
  "owasp-zap-integration": {
    title: "OWASP ZAP Integration",
    body: ["OWASP ZAP baseline scans import passive alerts for authorized website assets. Full scans require an additional traffic warning confirmation.", "SaaS-hosted ZAP scanning blocks localhost, private IP ranges, link-local networks, cloud metadata targets, and hostnames that resolve internally.", "Run ZAP locally with Docker and configure ZAP_ENABLED, ZAP_API_URL, ZAP_API_KEY, timeout, polling, and concurrency environment variables."],
  },
  "nuclei-integration": {
    title: "Nuclei Integration",
    body: ["Nuclei scans run backend-controlled template groups only: Safe Baseline, CVE, and Full Template.", "Full Template scans require an additional confirmation because they may generate higher traffic and trigger logs or controls.", "SecureScan blocks localhost, private IP ranges, cloud metadata targets, and hostnames resolving to internal addresses before any Nuclei job is queued."],
  },
  "sqlmap-integration": {
    title: "sqlmap Integration",
    body: ["sqlmap scans are detection-focused and require a specific endpoint plus parameter. Whole-site crawling, dumping, shell access, file access, tamper scripts, and extraction workflows are not supported.", "Each scan requires asset authorization confirmation and a SQL injection testing confirmation.", "SecureScan verifies the target belongs to the selected asset domain and blocks localhost, private networks, and metadata targets before queueing."],
  },
  "authorized-scanning-policy": {
    title: "Authorized Scanning Policy",
    body: ["Only scan websites, applications, APIs, or repositories that you own or have permission to test.", "SecureScan is defensive only and does not provide exploitation workflows."],
  },
};

export default async function DocDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = content[slug] ?? content["getting-started"];
  return (
    <ProtectedShell>
      <h1 className="text-3xl font-semibold text-ink">{page.title}</h1>
      <Card className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
        {page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </Card>
    </ProtectedShell>
  );
}
