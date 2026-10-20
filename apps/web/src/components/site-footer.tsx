import Link from "next/link";
import { Shield, CheckCircle2, Lock, ExternalLink } from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20">
                <Shield size={22} className="stroke-[2.2]" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-semibold tracking-wider uppercase text-teal-400">LuminarIQ</span>
                <span className="block text-xl font-bold tracking-tight text-white">SecureScan</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Defensive security audit SaaS platform by <strong className="text-white font-medium">LuminarIQ SoftSol Pvt. Ltd.</strong>{" "}
              Identify vulnerabilities, prioritize remediation, and generate verified audit reports before attackers find exposure.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/60 px-3 py-1 font-medium text-teal-300">
                <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" />
                Defensive Scanning Only
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-medium text-slate-300">
                <Lock size={12} className="text-teal-400" />
                OWASP &amp; CWE Aligned
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Platform</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/register" className="transition hover:text-white">Start Free Scan</Link>
              </li>
              <li>
                <Link href="/pricing" className="transition hover:text-white">Pricing &amp; Plans</Link>
              </li>
              <li>
                <Link href="/reports" className="transition hover:text-white">Sample Reports</Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-white">Customer Workspace</Link>
              </li>
              <li>
                <Link href="/admin/login" className="transition hover:text-white">Admin Portal</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Security &amp; Integrations</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/docs/owasp-zap-integration" className="transition hover:text-white">OWASP ZAP Engine</Link>
              </li>
              <li>
                <Link href="/docs/nuclei-integration" className="transition hover:text-white">Nuclei Templates</Link>
              </li>
              <li>
                <Link href="/docs/sqlmap-integration" className="transition hover:text-white">SQLMap Detection</Link>
              </li>
              <li>
                <Link href="/docs/security-score" className="transition hover:text-white">Security Scoring</Link>
              </li>
              <li>
                <Link href="/docs/remediation" className="transition hover:text-white">Remediation Guides</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Resources &amp; Trust</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/docs" className="transition hover:text-white">Documentation</Link>
              </li>
              <li>
                <Link href="/docs/authorized-scanning-policy" className="transition hover:text-white">Authorized Scan Policy</Link>
              </li>
              <li>
                <Link href="/docs/severity-levels" className="transition hover:text-white">Severity Ratings</Link>
              </li>
              <li>
                <Link href="/docs/getting-started" className="transition hover:text-white">Getting Started Guide</Link>
              </li>
              <li className="pt-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 size={13} />
                  Scanner Engines Healthy
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Compliance Bottom Bar */}
        <div className="mt-14 border-t border-slate-800/80 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-slate-300 md:flex-row">
            <div>
              <p>
                © {currentYear} <strong className="text-white font-medium">LuminarIQ SoftSol Pvt. Ltd.</strong> All rights reserved.
              </p>
              <p className="mt-1 text-slate-300">
                LuminarIQ SecureScan is designed exclusively for authorized defensive security assessments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Link href="/docs/authorized-scanning-policy" className="transition hover:text-slate-300">
                Acceptable Use Policy
              </Link>
              <Link href="/pricing" className="transition hover:text-slate-300">
                Subscription Terms
              </Link>
              <Link href="/admin/login" className="transition hover:text-slate-300">
                Staff Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
