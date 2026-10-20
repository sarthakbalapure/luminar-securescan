import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";

const plans = [
  {
    name: "Plus",
    price: "₹999/month",
    description: "Essential security visibility for small websites and early teams.",
    features: ["3 scans per month", "Basic security scan", "Basic report", "Security score", "Severity summary", "Finding list", "Basic recommendations"],
    cta: "Start with Plus",
  },
  {
    name: "Pro",
    price: "₹2,999/month",
    description: "Detailed remediation guidance for engineering and IT teams.",
    features: ["10 scans per month", "Detailed security report", "Problem and risk explanation", "Business and technical impact", "Step-by-step fix guidance", "Code/config examples", "Retest steps", "OWASP mapping"],
    cta: "Upgrade to Pro",
  },
  {
    name: "Max",
    price: "₹7,999/month",
    description: "Advanced monitoring with direct admin remediation support.",
    features: ["30 scans per month", "Daily scan support", "Detailed report", "All Pro remediation guidance", "10 admin fix-help requests per month", "Request help from finding pages", "Priority support placeholder"],
    cta: "Upgrade to Max",
  },
];

export default function PricingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-semibold text-signal">LuminarIQ SecureScan</Link>
          <div className="flex gap-3 text-sm font-medium"><Link href="/login">Sign in</Link><Link href="/register" className="text-signal">Create account</Link></div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-14">
        <p className="text-sm font-semibold text-signal">Simple security plans</p>
        <h1 className="mt-2 text-4xl font-semibold">Choose the coverage your team needs</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Every plan supports authorized defensive scanning. Higher plans add scan capacity, detailed remediation, and hands-on support.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <section key={plan.name} className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold text-signal">{plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
                {plan.features.map((feature) => <li key={feature} className="border-b border-slate-100 pb-2">{feature}</li>)}
              </ul>
              <Link href="/register" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white">{plan.cta}</Link>
            </section>
          ))}
        </div>
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Payments are currently handled manually. Contact admin to activate or upgrade your plan.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
