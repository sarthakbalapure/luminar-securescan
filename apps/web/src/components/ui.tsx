import { cn } from "../lib/cn";
import { formatEnum, severityTone, statusTone } from "../lib/security-ui";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60",
        props.className
      )}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20",
        props.className
      )}
    />
  );
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium text-slate-700", props.className)} />;
}

export function Card(props: React.HTMLAttributes<HTMLElement>) {
  return <section {...props} className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-panel", props.className)} />;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-ember">{message}</p>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tone)}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge tone={severityTone(severity)}>{formatEnum(severity)}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{formatEnum(status)}</Badge>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="text-center">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <Card className="border-red-200 bg-red-50 text-sm text-red-700">{message}</Card>;
}
