"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { ProtectedShell } from "../../../components/protected-shell";
import { Button, Card, FieldError, Input, Label } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";

const schema = z.object({
  name: z.string().min(2, "Enter an organization name.").max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
});

export default function NewOrganizationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", slug: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      const organization = await apiRequest<{ id: string }>("/organizations", { method: "POST", body: JSON.stringify(parsed.data) });
      router.replace(`/organizations/${organization.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      <Card className="max-w-xl">
        <h1 className="text-2xl font-semibold text-ink">Create organization</h1>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Organization Name</Label>
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
    </ProtectedShell>
  );
}
