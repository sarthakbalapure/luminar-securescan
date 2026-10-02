"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, FieldError, Input, Label, Select } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";

type Organization = { id: string; name: string };
const schema = z.object({
  organizationId: z.string().uuid("Choose an organization."),
  name: z.string().min(2, "Enter a project name.").max(120),
  description: z.string().max(1000).optional(),
});

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState({ organizationId: params.get("organizationId") ?? "", name: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<Organization[]>("/organizations").then((list) => {
      setOrganizations(list);
      setForm((current) => ({ ...current, organizationId: current.organizationId || list[0]?.id || "" }));
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setMessage("");
    setSaving(true);
    try {
      const project = await apiRequest<{ id: string }>("/projects", { method: "POST", body: JSON.stringify(parsed.data) });
      router.replace(`/projects/${project.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Create project</h1>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label>Organization</Label>
          <Select value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}>
            <option value="">Select organization</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </Select>
          <FieldError message={errors.organizationId} />
        </div>
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <FieldError message={errors.description} />
        </div>
        {message ? <p className="text-sm text-ember">{message}</p> : null}
        <Button disabled={saving}>{saving ? "Creating..." : "Create project"}</Button>
      </form>
    </Card>
  );
}

export default function NewProjectPage() {
  return (
    <ProtectedShell>
      <Suspense fallback={<p className="text-sm text-slate-600">Loading project form...</p>}>
        <NewProjectForm />
      </Suspense>
    </ProtectedShell>
  );
}
