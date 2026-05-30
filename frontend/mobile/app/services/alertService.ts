import { apiFetch } from "./apiClient";

export interface ApiAlert {
  id: string;
  loadId?: string;
  companyId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function getAlerts(opts?: { loadId?: string; unreadOnly?: boolean }): Promise<ApiAlert[]> {
  const params = new URLSearchParams();
  if (opts?.loadId) params.set("loadId", opts.loadId);
  if (opts?.unreadOnly) params.set("unreadOnly", "true");
  const qs = params.toString();
  return apiFetch(`/api/alerts${qs ? `?${qs}` : ""}`);
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiFetch(`/api/alerts/${alertId}/read`, { method: "PATCH" });
}

export async function markAllRead(loadId?: string): Promise<void> {
  await apiFetch("/api/alerts/read-all", {
    method: "PATCH",
    body: JSON.stringify({ loadId }),
  });
}
