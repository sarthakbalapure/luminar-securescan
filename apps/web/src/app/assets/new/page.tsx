"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { parseOpenApiSpec, type ParsedOpenApiEndpoint } from "@luminar-iq/shared";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, FieldError, Input, Label, Select } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";

type Project = { id: string; name: string; organization: { name: string } };
const schema = z.object({
  projectId: z.string().uuid("Choose a project."),
  type: z.enum(["WEBSITE", "WEB_APP", "API", "REPOSITORY", "CLOUD"]),
  name: z.string().min(2, "Enter an asset name.").max(120),
  url: z.string().url("Enter a valid URL."),
  environment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT"]),
  businessCriticality: z.enum(["HIGH", "MEDIUM", "LOW"]),
  verifiedStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED"]),
  riskLevel: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  openApiSpecContent: z.string().optional(),
  openApiSpecUrl: z.string().url("Enter a valid OpenAPI URL.").optional().or(z.literal("")),
  baseApiUrl: z.string().url("Enter a valid base API URL.").optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.type === "API" && !value.openApiSpecContent?.trim() && !value.openApiSpecUrl?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["openApiSpecContent"], message: "Provide an OpenAPI upload or URL." });
  }
});

function endpointKey(endpoint: ParsedOpenApiEndpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function NewAssetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    projectId: params.get("projectId") ?? "",
    type: "WEBSITE",
    name: "",
    url: "",
    environment: "PRODUCTION",
    businessCriticality: "MEDIUM",
    verifiedStatus: "UNVERIFIED",
    riskLevel: "MEDIUM",
    openApiSpecContent: "",
    openApiSpecUrl: "",
    baseApiUrl: "",
  });
  const [parsedEndpoints, setParsedEndpoints] = useState<ParsedOpenApiEndpoint[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<Project[]>("/projects").then((list) => {
      setProjects(list);
      setForm((current) => ({ ...current, projectId: current.projectId || list[0]?.id || "" }));
    });
  }, []);

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
      const payload = {
        ...parsed.data,
        openApiSpecContent: parsed.data.openApiSpecContent?.trim() || undefined,
        openApiSpecUrl: parsed.data.openApiSpecUrl || undefined,
        baseApiUrl: parsed.data.baseApiUrl || parsed.data.url,
      };
      const asset = await apiRequest<{ id: string }>("/assets", { method: "POST", body: JSON.stringify(payload) });
      router.replace(`/assets/${asset.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create asset.");
    } finally {
      setSaving(false);
    }
  }

  function updateSpecContent(content: string) {
    setForm({ ...form, openApiSpecContent: content });
    try {
      setParsedEndpoints(content.trim() ? parseOpenApiSpec(content).endpoints : []);
      setErrors((current) => ({ ...current, openApiSpecContent: "" }));
    } catch (error) {
      setParsedEndpoints([]);
      if (content.trim()) {
        setErrors((current) => ({ ...current, openApiSpecContent: error instanceof Error ? error.message : "Spec could not be parsed." }));
      }
    }
  }

  async function readSpecFile(file?: File) {
    if (file) updateSpecContent(await file.text());
  }

  return (
    <Card className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Add asset</h1>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.organization.name} - {project.name}</option>)}
          </Select>
          <FieldError message={errors.projectId} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="WEBSITE">Website</option>
            <option value="WEB_APP">Web app</option>
            <option value="API">API</option>
            <option value="REPOSITORY">Repository</option>
            <option value="CLOUD">Cloud</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label>{form.type === "API" ? "Base API URL" : form.type === "REPOSITORY" ? "GitHub repository URL" : "URL"}</Label>
          <Input
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            placeholder={form.type === "REPOSITORY" ? "https://github.com/org/repo" : undefined}
          />
          <FieldError message={errors.url} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })}>
              <option value="PRODUCTION">Production</option>
              <option value="STAGING">Staging</option>
              <option value="DEVELOPMENT">Development</option>
            </Select>
              <FieldError message={errors.environment} />
          </div>
          <div className="space-y-2">
            <Label>Business Criticality</Label>
            <Select value={form.businessCriticality} onChange={(event) => setForm({ ...form, businessCriticality: event.target.value, riskLevel: event.target.value })}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
            <FieldError message={errors.businessCriticality} />
          </div>
        </div>
        {form.type === "API" ? (
          <div className="space-y-4 rounded-md border border-slate-200 p-4">
            <div className="space-y-2">
              <Label>OpenAPI URL</Label>
              <Input value={form.openApiSpecUrl} onChange={(event) => setForm({ ...form, openApiSpecUrl: event.target.value })} placeholder="https://api.example.com/openapi.json" />
              <FieldError message={errors.openApiSpecUrl} />
            </div>
            <div className="space-y-2">
              <Label>OpenAPI JSON/YAML upload</Label>
              <Input type="file" accept=".json,.yaml,.yml,application/json,text/yaml" onChange={(event) => readSpecFile(event.target.files?.[0])} />
            </div>
            <div className="space-y-2">
              <Label>Paste OpenAPI JSON/YAML</Label>
              <textarea
                className="min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-signal"
                value={form.openApiSpecContent}
                onChange={(event) => updateSpecContent(event.target.value)}
                placeholder="openapi: 3.0.3..."
              />
              <FieldError message={errors.openApiSpecContent} />
            </div>
            {parsedEndpoints.length ? (
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-sm font-medium text-ink">{parsedEndpoints.length} parsed endpoints</p>
                <div className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-700">
                  {parsedEndpoints.slice(0, 30).map((endpoint) => <p key={endpointKey(endpoint)}>{endpointKey(endpoint)}</p>)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {message ? <p className="text-sm text-ember">{message}</p> : null}
        <Button disabled={saving}>{saving ? "Adding..." : "Add asset"}</Button>
      </form>
    </Card>
  );
}

export default function NewAssetPage() {
  return (
    <ProtectedShell>
      <Suspense fallback={<p className="text-sm text-slate-600">Loading asset form...</p>}>
        <NewAssetForm />
      </Suspense>
    </ProtectedShell>
  );
}
