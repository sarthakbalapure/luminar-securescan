import { assertAllowedResolvedTarget } from "./scanner-core";

export type HttpClientResponse = {
  url: string;
  status: number;
  headers: Headers;
  bodySnippet: string;
  truncated: boolean;
  redirectedTo?: string;
};

export type HttpRequestOptions = {
  method?: "GET" | "HEAD";
  timeoutMs?: number;
  maxBodyBytes?: number;
  maxRedirects?: number;
};

const defaultTimeoutMs = Number(process.env.SCANNER_HTTP_TIMEOUT_MS ?? 8000);
const defaultMaxBodyBytes = Number(process.env.SCANNER_MAX_RESPONSE_BYTES ?? 32768);

export async function requestUrl(url: string, options: HttpRequestOptions = {}): Promise<HttpClientResponse> {
  return requestUrlInternal(url, options, 0);
}

async function requestUrlInternal(url: string, options: HttpRequestOptions, redirectCount: number): Promise<HttpClientResponse> {
  await assertAllowedResolvedTarget(url, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  const method = options.method ?? "GET";
  const maxRedirects = options.maxRedirects ?? 3;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);

  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "LuminarIQ-SecureScan/1.0 defensive-baseline",
        accept: "text/html,text/plain,application/json,*/*;q=0.2",
      },
    });

    const location = response.headers.get("location");
    if (isRedirect(response.status) && location) {
      const redirectedTo = new URL(location, url).toString();
      if (redirectCount < maxRedirects) {
        const redirected = await requestUrlInternal(redirectedTo, options, redirectCount + 1);
        return { ...redirected, redirectedTo };
      }
      return {
        url,
        status: response.status,
        headers: response.headers,
        bodySnippet: "",
        truncated: false,
        redirectedTo,
      };
    }

    const body = method === "HEAD" ? { bodySnippet: "", truncated: false } : await readLimitedBody(response, options.maxBodyBytes ?? defaultMaxBodyBytes);
    return {
      url,
      status: response.status,
      headers: response.headers,
      ...body,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${method} ${url} timed out after ${options.timeoutMs ?? defaultTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedBody(response: Response, maxBodyBytes: number) {
  if (!response.body) return { bodySnippet: "", truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    if (total + value.byteLength > maxBodyBytes) {
      chunks.push(value.slice(0, Math.max(0, maxBodyBytes - total)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  const combined = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    bodySnippet: new TextDecoder("utf-8", { fatal: false }).decode(combined),
    truncated,
  };
}

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}
