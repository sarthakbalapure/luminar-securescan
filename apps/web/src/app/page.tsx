import Link from "next/link";
import { SiteFooter } from "../components/site-footer";

export default function Page() {
  const features = [
    "HTTPS, TLS, headers, cookies, and exposed-file checks",
    "Severity-ranked findings mapped to OWASP and CWE",
    "Developer-ready remediation and retest guidance",
    "Executive, technical, and full audit reports",
  ];
  const sampleFindings = [
    ["Critical", "Exposed environment file detected"],
    ["High", "Cookie missing Secure flag"],
    ["Medium", "Missing Content Security Policy header"],
  ];
  const faqs = [
    ["Is SecureScan defensive only?", "Yes. Scans require authorization confirmation and avoid offensive exploitation workflows."],
    ["Can agencies use it?", "Yes. Organizations, projects, assets, and reports support multi-client workflows."],
    ["Does it scan APIs?", "The platform supports API assets and OpenAPI-driven baseline checks."],
  ];

  return (
    <main className="bg-white text-ink">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid min-h-[88vh] max-w-7xl content-center gap-10 px-6 py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm font-semibold text-teal-300">LuminarIQ SecureScan</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight md:text-6xl">Find and fix security risks before attackers do.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              LuminarIQ SecureScan audits your websites, applications, and APIs, ranks vulnerabilities by severity, and gives developer-ready remediation guidance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-300" href="/register">Start Free Security Scan</Link>
              <Link className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" href="/reports">View Sample Report</Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <p className="text-sm text-slate-300">Live posture preview</p>
            <div className="mt-5 grid gap-3">
              {sampleFindings.map(([severity, title]) => (
                <div key={title} className="rounded-md border border-white/10 bg-slate-900 p-4">
                  <p className="text-xs font-semibold uppercase text-teal-300">{severity}</p>
                  <p className="mt-1 font-medium">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section title="The Problem" text="Small teams ship fast, but security evidence, remediation ownership, and stakeholder reports often live in different tools." />
      <Section title="The Solution" text="SecureScan gives teams a single workflow for authorized asset scans, prioritized findings, remediation guidance, retests, and reports." />

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-semibold">How It Works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {["Register asset", "Confirm authorization", "Run baseline scan", "Fix and report"].map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-signal">Step {index + 1}</p>
                <h3 className="mt-2 font-semibold">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-semibold">Key Features</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((feature) => <div key={feature} className="rounded-lg border border-slate-200 p-5 text-sm text-slate-700">{feature}</div>)}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-semibold">Pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Plus", "3 scans per month with Basic reports"],
              ["Pro", "10 scans per month with detailed remediation"],
              ["Max", "30 scans and 10 admin fix-help requests per month"],
            ].map(([plan, detail]) => (
              <div key={plan} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-semibold">{plan}</h3>
                <p className="mt-3 text-sm text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
          <Link className="mt-6 inline-flex text-sm font-semibold text-signal" href="/pricing">Compare all plan features</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="mt-8 grid gap-4">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-lg border border-slate-200 p-5">
              <h3 className="font-semibold">{question}</h3>
              <p className="mt-2 text-sm text-slate-600">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-16 text-center text-white">
        <h2 className="text-3xl font-semibold">Ready to review your security posture?</h2>
        <Link className="mt-6 inline-flex rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950" href="/register">Start Free Security Scan</Link>
      </section>

      <SiteFooter />
    </main>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <p className="text-sm font-semibold text-signal">LuminarIQ SoftSol Pvt. Ltd.</p>
      <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      <p className="mt-4 max-w-3xl text-slate-600">{text}</p>
    </section>
  );
}
