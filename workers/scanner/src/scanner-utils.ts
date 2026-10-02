export const DEFAULT_TIMEOUT_MS = Number(process.env.SCANNER_CHECK_TIMEOUT_MS ?? 8000);

export async function withTimeout<T>(label: string, task: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timeout);
  }
}

export function dedupeFindings<T extends { title: string; category: string; evidence?: { url?: string }; evidenceSummary: string }>(findings: T[]): T[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.category}|${finding.title}|${finding.evidence?.url ?? ""}|${finding.evidenceSummary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
