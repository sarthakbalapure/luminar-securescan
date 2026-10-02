import { ProtectedShell } from "../../components/protected-shell";
import { Card } from "../../components/ui";

export default function SettingsPage() {
  return (
    <ProtectedShell>
      <h1 className="text-3xl font-semibold text-ink">Settings</h1>
      <Card className="mt-5 text-sm text-slate-600">Workspace preferences and account controls will be configured here.</Card>
    </ProtectedShell>
  );
}
