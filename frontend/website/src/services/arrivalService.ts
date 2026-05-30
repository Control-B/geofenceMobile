import { apiFetch } from "./apiClient";

export interface ApiLoad {
  id: string;
  loadNumber: string;
  referenceNumber?: string;
  carrier?: string;
  truckNumber?: string;
  trailerNumber?: string;
  driverName?: string;
  driverPhone?: string;
  driverUserId?: string;
  appointmentTime?: string;
  status: string;
  dockAssignment?: string;
  queuePosition?: number;
  instructions?: string;
  arrivedTime?: string;
  checkInTime?: string;
}

export interface ApiCheckinSession {
  id: string;
  loadId: string;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  isInsideGeofence?: boolean;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  arrivedAt?: string;
  checkedInAt?: string;
}

export interface ApiDockAssignment {
  id: string;
  loadId: string;
  dockName: string;
  assignedBy: string;
  assignedByName?: string;
  notes?: string;
  assignedAt: string;
}

/** Fetch all loads (warehouse sees everything) */
export async function getLoads(): Promise<ApiLoad[]> {
  return apiFetch<ApiLoad[]>("/trips");
}

/** Fetch pending check-in sessions awaiting approval */
export async function getPendingCheckins(): Promise<ApiCheckinSession[]> {
  return apiFetch<ApiCheckinSession[]>("/checkins/pending");
}

/** Assign a dock to a load and approve the check-in */
export async function assignDock(payload: {
  loadId: string;
  dockName: string;
  notes?: string;
}): Promise<ApiDockAssignment> {
  return apiFetch<ApiDockAssignment>("/dock-assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Get existing dock assignment for a load */
export async function getDockAssignment(loadId: string): Promise<ApiDockAssignment | null> {
  try {
    return await apiFetch<ApiDockAssignment>(`/dock-assignments/${loadId}`);
  } catch {
    return null;
  }
}

/** Update load status */
export async function patchStatus(loadId: string, status: string): Promise<void> {
  await apiFetch(`/status/${loadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
