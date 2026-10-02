"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { register } from "../../lib/api";
import { Button, Card, FieldError, Input, Label } from "../../components/ui";

const schema = z.object({
  name: z.string().min(2, "Enter your name.").max(120),
  organizationName: z.string().min(2, "Enter your company or organization name.").max(120),
  email: z.string().email("Enter a valid email."),
  password: z.string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, "Use uppercase, lowercase, number, and special character."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords must match.",
});

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", organizationName: "", email: "", password: "", confirmPassword: "" });
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
      await register(parsed.data.name, parsed.data.organizationName, parsed.data.email, parsed.data.password);
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold text-signal">LuminarIQ SecureScan</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Create your workspace</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Company / Organization Name</Label>
            <Input id="organizationName" value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} />
            <FieldError message={errors.organizationName} />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
            <FieldError message={errors.confirmPassword} />
          </div>
          {message ? <p className="text-sm text-ember">{message}</p> : null}
          <Button className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account? <Link className="font-medium text-signal" href="/login">Log in</Link>
        </p>
      </Card>
    </main>
  );
}
