import { apiFetch } from "./apiClient";
import type { ApiLoad } from "./tripService";

export interface StatusHistory {
  id: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  metadata?: string;
  createdAt: string;
}

export interface StatusResponse {
  load: ApiLoad;
  history: StatusHistory[];
}

export async function getStatus(loadId: string): Promise<StatusResponse> {
  return apiFetch(`/api/status/${loadId}`);
}

export async function updateStatus(loadId: string, status: string): Promise<ApiLoad> {
  return apiFetch(`/api/status/${loadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
