import { apiFetch } from "./apiClient";

export interface CheckinPayload {
  loadId: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

export interface CheckinSession {
  id: string;
  loadId: string;
  driverId?: string;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  isInsideGeofence?: boolean;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  arrivedAt: string;
  checkedInAt?: string;
}

export interface GeofenceError {
  error: string;
  distanceMeters: number;
  geofenceRadiusMeters: number;
}

export async function submitArrival(payload: CheckinPayload): Promise<{ session: CheckinSession; message: string }> {
  return apiFetch("/api/checkins/arrival", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCheckins(loadId: string): Promise<CheckinSession[]> {
  return apiFetch(`/api/checkins/${loadId}`);
}

export async function submitCheckout(loadId: string): Promise<{ message: string }> {
  return apiFetch("/api/checkins/checkout", {
    method: "POST",
    body: JSON.stringify({ loadId }),
  });
}
