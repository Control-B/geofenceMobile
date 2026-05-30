import { apiFetch, setToken, clearToken, getToken } from "./apiClient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(result.token);
  return result;
}

export async function register(payload: {
  name: string; email: string; password: string;
  role?: string; phone?: string;
}): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await setToken(result.token);
  return result;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
