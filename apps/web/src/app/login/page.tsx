"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { login } from "../../lib/api";
import { isAdminRole } from "../../lib/roles";
import { Button, Card, FieldError, Input, Label } from "../../components/ui";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const payload = await login(parsed.data.email, parsed.data.password);
      router.replace(isAdminRole(payload.user.role) ? "/admin/dashboard" : "/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold text-signal">LuminarIQ SecureScan</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in to your SecureScan workspace</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <FieldError message={errors.password} />
          </div>
          {message ? <p className="text-sm text-ember">{message}</p> : null}
          <Button className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
        </form>
        <p className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-slate-600">
          <Link className="font-medium text-signal" href="/register">Create an account</Link>
          <Link className="font-medium text-slate-500" href="/login">Forgot password</Link>
        </p>
        <p className="mt-5 text-xs text-slate-500">Only scan websites, applications, and platforms that you own or are authorized to test.</p>
      </Card>
    </main>
  );
}
