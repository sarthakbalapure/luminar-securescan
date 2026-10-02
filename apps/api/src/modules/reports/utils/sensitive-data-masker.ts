const SECRET_VALUE = "********";

const sensitivePatterns: Array<[RegExp, string]> = [
  [/(authorization\s*[:=]\s*bearer\s+)[^\s,;"']+/gi, `$1${SECRET_VALUE}`],
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${SECRET_VALUE}`],
  [/(set-cookie\s*:\s*)[^\r\n]+/gi, `$1${SECRET_VALUE}`],
  [/(cookie\s*:\s*)[^\r\n]+/gi, `$1${SECRET_VALUE}`],
  [/(password|passwd|pwd|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token)\s*([:=])\s*([^\s&,;"']+)/gi, `$1$2${SECRET_VALUE}`],
  [/("(?:password|passwd|pwd|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token)"\s*:\s*")[^"]+/gi, `$1${SECRET_VALUE}`],
  [/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, SECRET_VALUE],
];

export function maskSensitiveData(value: unknown, maxLength = 4000): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : safeStringify(value);
  for (const [pattern, replacement] of sensitivePatterns) {
    text = text.replace(pattern, replacement);
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

export function maskSensitiveObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSensitiveObject);
  if (!value || typeof value !== "object") return typeof value === "string" ? maskSensitiveData(value) : value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    if (/password|passwd|pwd|secret|token|authorization|cookie|api.?key/i.test(key)) {
      return [key, SECRET_VALUE];
    }
    return [key, maskSensitiveObject(entry)];
  }));
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(maskSensitiveObject(value));
  } catch {
    return "[unavailable]";
  }
}
