import { cn } from "../lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "critical" | "warning" | "good";
};

const tones = {
  default: "border-slate-200",
  critical: "border-ember/40 bg-red-50",
  warning: "border-amber/40 bg-orange-50",
  good: "border-signal/40 bg-teal-50"
};

export function MetricCard({ label, value, detail, tone = "default" }: MetricCardProps) {
  return (
    <section className={cn("rounded-lg border bg-white p-4 shadow-panel", tones[tone])}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </section>
  );
}
