import { apiFetch } from "./apiClient";

export interface ApiLoad {
  id: string;
  loadNumber: string;
  referenceNumber?: string;
  poNumber?: string;
  carrier: string;
  truckNumber?: string;
  trailerNumber?: string;
  driverPhone?: string;
  driverName?: string;
  pickupFacility?: string;
  pickupAddress?: string;
  deliveryFacility?: string;
  deliveryAddress?: string;
  appointmentTime?: string;
  status: string;
  dockAssignment?: string;
  queuePosition?: number;
  instructions?: string;
  eta?: string;
  distance?: string;
  arrivedTime?: string;
  checkInTime?: string;
  createdAt: string;
}

export async function getCurrentTrip(): Promise<ApiLoad> {
  return apiFetch<ApiLoad>("/api/trips/current");
}

export async function getAllTrips(): Promise<ApiLoad[]> {
  return apiFetch<ApiLoad[]>("/api/trips");
}

export interface CreateTripPayload {
  carrier: string;
  loadNumber: string;
  referenceNumber?: string;
  poNumber?: string;
  truckNumber?: string;
  trailerNumber?: string;
  driverPhone?: string;
  pickupFacilityId?: string;
  deliveryFacilityId?: string;
  appointmentTime?: string;
  eta?: string;
  distance?: string;
}

export async function createTrip(payload: CreateTripPayload): Promise<ApiLoad> {
  return apiFetch<ApiLoad>("/api/trips", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
