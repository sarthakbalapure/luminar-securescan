const TERMINAL_SCAN_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function isTerminalScanStatus(status: string): boolean {
  return TERMINAL_SCAN_STATUSES.has(status);
}

export function formatScanElapsed(
  startedAt?: string | null,
  completedAt?: string | null,
  now = Date.now(),
): string {
  if (!startedAt) return "N/A";

  const started = Date.parse(startedAt);
  const finished = completedAt ? Date.parse(completedAt) : now;
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return "N/A";

  const seconds = Math.max(0, Math.round((finished - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
