import { ProtectedShell } from "../../components/protected-shell";
import { Card } from "../../components/ui";
import Link from "next/link";

const docs = [
  ["Getting Started", "/docs/getting-started"],
  ["Security Score", "/docs/security-score"],
  ["Severity Levels", "/docs/severity-levels"],
  ["Remediation", "/docs/remediation"],
  ["Reports", "/docs/reports"],
  ["OWASP ZAP Integration", "/docs/owasp-zap-integration"],
  ["Nuclei Integration", "/docs/nuclei-integration"],
  ["sqlmap Integration", "/docs/sqlmap-integration"],
  ["Authorized Scanning Policy", "/docs/authorized-scanning-policy"],
];

export default function DocsPage() {
  return (
    <ProtectedShell>
      <h1 className="text-3xl font-semibold text-ink">Docs</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {docs.map(([label, href]) => (
          <Card key={href}>
            <Link className="font-semibold text-ink hover:text-signal" href={href}>{label}</Link>
            <p className="mt-2 text-sm text-slate-600">Learn how LuminarIQ SecureScan supports authorized defensive security reviews.</p>
          </Card>
        ))}
      </div>
    </ProtectedShell>
  );
}
