"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ProtectedShell } from "../../components/protected-shell";
import { Button, Card, FieldError, Input, Label, Select } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Organization = { id: string; name: string };
type Project = { id: string; name: string; description?: string | null; organization: { name: string }; _count?: { assets: number } };
const schema = z.object({
  organizationId: z.string().uuid("Choose an organization."),
  name: z.string().min(2, "Enter a project name.").max(120),
  description: z.string().max(1000).optional(),
});

export default function ProjectsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ organizationId: "", name: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([apiRequest<Organization[]>("/organizations"), apiRequest<Project[]>("/projects")])
      .then(([orgs, list]) => {
        setOrganizations(orgs);
        setProjects(list);
        setForm((current) => ({ ...current, organizationId: current.organizationId || orgs[0]?.id || "" }));
      })
      .finally(() => setLoading(false));
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
      await apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(parsed.data) });
      setForm({ ...form, name: "", description: "" });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h1 className="text-xl font-semibold text-ink">New project</h1>
          <form className="mt-4 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}>
                <option value="">Select organization</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </Select>
              <FieldError message={errors.organizationId} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-ink">Projects</h2>
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href="/projects/new">New project</Link>
          </div>
          {loading ? <p className="text-sm text-slate-600">Loading projects...</p> : null}
          {projects.map((project) => (
            <Card key={project.id} className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">{project.name}</h3>
                <p className="text-sm text-slate-600">{project.organization.name} · {project._count?.assets ?? 0} assets</p>
              </div>
              <Link className="text-sm font-medium text-signal" href={`/projects/${project.id}`}>Open</Link>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedShell>
  );
}
