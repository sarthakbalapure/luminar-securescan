"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button, FieldError, Input, Label } from "../../../components/ui";
import { adminLogin } from "../../../lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function AdminLoginPage() {
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
      await adminLogin(parsed.data.email, parsed.data.password);
      router.replace("/admin/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Admin login failed.";
      setMessage(errorMessage.includes("Admin privileges") ? "Access denied. Admin privileges required." : errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101827] px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl place-items-center">
        <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <p className="text-sm font-semibold text-teal-300">LuminarIQ SecureScan</p>
          <h1 className="mt-2 text-3xl font-semibold">Admin Portal</h1>
          <p className="mt-2 text-sm text-slate-300">Authorized administrators only.</p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label className="text-slate-200" htmlFor="admin-email">Email</Label>
              <Input id="admin-email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200" htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <FieldError message={errors.password} />
            </div>
            {message ? <p className="text-sm text-red-300">{message}</p> : null}
            <Button className="w-full bg-teal-400 text-slate-950 hover:bg-teal-300" disabled={loading}>{loading ? "Signing in..." : "Sign in as Admin"}</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
