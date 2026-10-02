"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ProtectedShell } from "../../components/protected-shell";
import { Button, Card, FieldError, Input, Label } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Organization = { id: string; name: string; slug: string; _count?: { projects: number; members: number } };
const schema = z.object({
  name: z.string().min(2, "Enter an organization name.").max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
});

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    apiRequest<Organization[]>("/organizations").then(setOrganizations).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await apiRequest<Organization>("/organizations", { method: "POST", body: JSON.stringify(parsed.data) });
      setForm({ name: "", slug: "" });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h1 className="text-xl font-semibold text-ink">New organization</h1>
          <form className="mt-4 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
              <FieldError message={errors.slug} />
            </div>
            {message ? <p className="text-sm text-ember">{message}</p> : null}
            <Button disabled={saving}>{saving ? "Creating..." : "Create organization"}</Button>
          </form>
        </Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-ink">Organizations</h2>
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href="/organizations/new">New organization</Link>
          </div>
          {loading ? <p className="text-sm text-slate-600">Loading organizations...</p> : null}
          {organizations.map((organization) => (
            <Card key={organization.id} className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">{organization.name}</h3>
                <p className="text-sm text-slate-600">{organization.slug}</p>
              </div>
              <Link className="text-sm font-medium text-signal" href={`/organizations/${organization.id}`}>
                Open
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedShell>
  );
}
