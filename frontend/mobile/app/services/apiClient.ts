import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Token management ─────────────────────────────────────────────────────────

const TOKEN_KEY = "dockflow_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { ...headers, ...extra };
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await buildHeaders(options?.headers as Record<string, string>);
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Do NOT set Content-Type — let the browser/RN set it with the boundary
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
