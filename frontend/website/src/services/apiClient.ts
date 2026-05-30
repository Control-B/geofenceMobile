const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

// Token stored in localStorage for web app
export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}
export function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
}
export function clearToken(): void {
  localStorage.removeItem("auth_token");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
