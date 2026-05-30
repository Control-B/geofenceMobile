import { apiFetch, setToken, clearToken } from "./apiClient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "driver" | "warehouse_clerk" | "dispatcher" | "admin";
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  clearToken();
}
