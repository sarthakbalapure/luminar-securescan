"use client";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "luminar_secure_scan_token";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const baseUrl = apiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach SecureScan API at ${baseUrl}. Check that the API server is running and use the same host/IP for the website.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new Error(message || "Request failed.");
  }
  return payload as T;
}

export async function apiResponse(path: string, options: RequestInit = {}) {
  const token = getToken();
  const baseUrl = apiUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach SecureScan API at ${baseUrl}. Check that the API server is running and use the same host/IP for the website.`);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new Error(message || "Request failed.");
  }
  return response;
}

export async function downloadApiFile(path: string, fallbackFilename: string) {
  const response = await apiResponse(path);
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filename = disposition?.match(/filename="?([^"]+)"?/i)?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string) {
  const payload = await apiRequest<{ accessToken: string; user: ApiUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(payload.accessToken);
  return payload;
}

export async function adminLogin(email: string, password: string) {
  const payload = await apiRequest<{ accessToken: string; user: ApiUser }>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(payload.accessToken);
  return payload;
}

export async function register(name: string, organizationName: string, email: string, password: string) {
  const payload = await apiRequest<{ accessToken: string; user: ApiUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, organizationName, email, password }),
  });
  setToken(payload.accessToken);
  return payload;
}

export async function logout() {
  try {
    if (getToken()) {
      await apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" });
    }
  } finally {
    clearToken();
  }
}

function apiUrl() {
  if (configuredApiUrl) return configuredApiUrl;
  return "/api/backend";
}
