"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "../../../components/protected-shell";
import { Card, ErrorState, Skeleton } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/security-ui";

type Organization = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  createdAt?: string;
  members: Array<{ role: string; user: { name: string; email: string } }>;
  subscriptionPlans?: Array<{ planName: string; isActive: boolean }>;
};

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Organization>(`/organizations/${params.id}`)
      .then(setOrganization)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Organization could not be loaded."));
  }, [params.id]);

  return (
    <ProtectedShell>
      {error ? <ErrorState message={error} /> : null}
      {!organization && !error ? <Skeleton className="h-56" /> : null}
      {organization ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-signal">Organization</p>
              <h1 className="text-3xl font-semibold text-ink">{organization.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{organization.slug}</p>
            </div>
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href={`/projects?organizationId=${organization.id}`}>View projects</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Meta label="Owner" value={organization.members.find((member) => member.role === "OWNER")?.user.email ?? "N/A"} />
            <Meta label="Status" value={organization.isActive === false ? "Inactive" : "Active"} />
            <Meta label="Created Date" value={formatDate(organization.createdAt)} />
            <Meta label="Plan" value={organization.subscriptionPlans?.find((plan) => plan.isActive)?.planName ?? "Unassigned"} />
          </div>
          <Card>
            <h2 className="text-xl font-semibold text-ink">Members</h2>
            <div className="mt-4 space-y-3">
              {organization.members.map((member) => (
                <div key={`${member.user.email}-${member.role}`} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-ink">{member.user.name}</p>
                  <p className="text-slate-600">{member.user.email} - {member.role}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </ProtectedShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </Card>
  );
}
