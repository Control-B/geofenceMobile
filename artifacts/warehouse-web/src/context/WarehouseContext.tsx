import React, { createContext, useCallback, useContext, useState } from "react";

export type DriverStatus =
  | "en_route" | "arrived" | "checked_in" | "waiting"
  | "dock_assigned" | "at_dock" | "loading" | "unloading"
  | "completed" | "departed";

export type DockStatus = "available" | "reserved" | "occupied" | "delayed" | "out_of_service";

export interface Arrival {
  id: string;
  driverName: string;
  carrier: string;
  truckNumber: string;
  trailerNumber: string;
  loadNumber: string;
  referenceNumber: string;
  arrivalTime: Date;
  appointmentTime: Date;
  status: DriverStatus;
  assignedDock?: string;
  waitingMinutes: number;
  notes?: string;
  checkedIn: boolean;
  instructions?: string;
}

export interface Dock {
  id: string;
  name: string;
  status: DockStatus;
  assignedDriverName?: string;
  assignedLoadNumber?: string;
  assignedCarrier?: string;
}

interface WarehouseContextType {
  arrivals: Arrival[];
  docks: Dock[];
  pendingCount: number;
  approveCheckIn: (arrivalId: string, dockId: string) => void;
  rejectCheckIn: (arrivalId: string) => void;
  markLoadingStarted: (arrivalId: string) => void;
  markLoadingComplete: (arrivalId: string) => void;
  markDeparture: (arrivalId: string) => void;
}

function minsAgo(m: number) { return new Date(Date.now() - m * 60000); }
function todayAt(h: number, m = 0) { const d = new Date(); d.setHours(h, m, 0, 0); return d; }

const INIT_ARRIVALS: Arrival[] = [
  { id: "a1", driverName: "Sarah Chen", carrier: "FastFreight LLC", truckNumber: "IL-2934", trailerNumber: "T-4521", loadNumber: "LD-771204", referenceNumber: "REF-334512", arrivalTime: minsAgo(45), appointmentTime: todayAt(10, 0), status: "at_dock", assignedDock: "14", waitingMinutes: 45, notes: "Refrigerated — Dock 14 only", checkedIn: true, instructions: "Dock 14, north entrance" },
  { id: "a2", driverName: "Mike Thompson", carrier: "Cornerstone Logistics", truckNumber: "OH-8821", trailerNumber: "T-6634", loadNumber: "LD-903881", referenceNumber: "REF-556782", arrivalTime: minsAgo(8), appointmentTime: todayAt(10, 30), status: "checked_in", waitingMinutes: 8, notes: "", checkedIn: true },
  { id: "a3", driverName: "David Kim", carrier: "Apex Carriers", truckNumber: "TX-1109", trailerNumber: "T-2211", loadNumber: "LD-556732", referenceNumber: "REF-778901", arrivalTime: minsAgo(52), appointmentTime: todayAt(9, 30), status: "loading", assignedDock: "08", waitingMinutes: 52, notes: "Heavy machinery — forklift required", checkedIn: true },
  { id: "a4", driverName: "Lisa Rodriguez", carrier: "Mountain West Freight", truckNumber: "CO-7743", trailerNumber: "T-8890", loadNumber: "LD-443215", referenceNumber: "REF-112234", arrivalTime: minsAgo(15), appointmentTime: todayAt(10, 30), status: "dock_assigned", assignedDock: "22", waitingMinutes: 15, notes: "", checkedIn: true, instructions: "Proceed to Dock 22. Use west entrance." },
  { id: "a5", driverName: "Amanda Foster", carrier: "ClearPath Logistics", truckNumber: "GA-5567", trailerNumber: "T-3378", loadNumber: "LD-991023", referenceNumber: "REF-990123", arrivalTime: minsAgo(5), appointmentTime: todayAt(11, 30), status: "arrived", waitingMinutes: 5, notes: "", checkedIn: false },
  { id: "a6", driverName: "Robert Wilson", carrier: "Lakefront Transport", truckNumber: "MI-3301", trailerNumber: "T-1145", loadNumber: "LD-667891", referenceNumber: "REF-445678", arrivalTime: minsAgo(72), appointmentTime: todayAt(9, 0), status: "completed", assignedDock: "06", waitingMinutes: 72, notes: "", checkedIn: true },
  { id: "a7", driverName: "Jennifer Walsh", carrier: "Sunrise Carriers", truckNumber: "FL-4423", trailerNumber: "T-5512", loadNumber: "LD-334892", referenceNumber: "REF-889012", arrivalTime: minsAgo(3), appointmentTime: todayAt(11, 15), status: "arrived", waitingMinutes: 3, notes: "Two pallets, oversized", checkedIn: false },
  { id: "a8", driverName: "Carlos Nguyen", carrier: "Pacific Bridge Trucking", truckNumber: "CA-8834", trailerNumber: "T-7721", loadNumber: "LD-224567", referenceNumber: "REF-334455", arrivalTime: minsAgo(0), appointmentTime: todayAt(11, 0), status: "en_route", waitingMinutes: 0, notes: "", checkedIn: false },
  { id: "a9", driverName: "Priya Patel", carrier: "Velocity Freight", truckNumber: "NY-5521", trailerNumber: "T-9001", loadNumber: "LD-112398", referenceNumber: "REF-667221", arrivalTime: minsAgo(2), appointmentTime: todayAt(11, 45), status: "arrived", waitingMinutes: 2, notes: "Fragile — glass products", checkedIn: false },
];

const INIT_DOCKS: Dock[] = Array.from({ length: 24 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  const id = `dock-${n}`;
  const name = `Dock ${n}`;
  const presets: Record<string, Dock> = {
    "dock-06": { id, name, status: "occupied", assignedDriverName: "Robert Wilson", assignedLoadNumber: "LD-667891", assignedCarrier: "Lakefront Transport" },
    "dock-07": { id, name, status: "out_of_service" },
    "dock-08": { id, name, status: "occupied", assignedDriverName: "David Kim", assignedLoadNumber: "LD-556732", assignedCarrier: "Apex Carriers" },
    "dock-11": { id, name, status: "delayed", assignedDriverName: "Sarah Chen", assignedLoadNumber: "LD-771204", assignedCarrier: "FastFreight LLC" },
    "dock-14": { id, name, status: "occupied", assignedDriverName: "Sarah Chen", assignedLoadNumber: "LD-771204", assignedCarrier: "FastFreight LLC" },
    "dock-16": { id, name, status: "out_of_service" },
    "dock-19": { id, name, status: "reserved", assignedDriverName: "Lisa Rodriguez", assignedLoadNumber: "LD-443215", assignedCarrier: "Mountain West Freight" },
    "dock-22": { id, name, status: "reserved", assignedDriverName: "Lisa Rodriguez", assignedLoadNumber: "LD-443215", assignedCarrier: "Mountain West Freight" },
  };
  return presets[id] ?? { id, name, status: "available" };
});

const Ctx = createContext<WarehouseContextType | undefined>(undefined);

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [arrivals, setArrivals] = useState<Arrival[]>(INIT_ARRIVALS);
  const [docks, setDocks] = useState<Dock[]>(INIT_DOCKS);

  const approveCheckIn = useCallback((arrivalId: string, dockId: string) => {
    const arrival = arrivals.find((a) => a.id === arrivalId);
    const dock = docks.find((d) => d.id === dockId);
    if (!arrival || !dock) return;
    const dockNum = dock.name.replace("Dock ", "");
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "dock_assigned" as DriverStatus, assignedDock: dockNum, checkedIn: true, instructions: `Proceed to ${dock.name}. Use main entrance.` } : a));
    setDocks((p) => p.map((d) => d.id === dockId ? { ...d, status: "reserved" as DockStatus, assignedDriverName: arrival.driverName, assignedLoadNumber: arrival.loadNumber, assignedCarrier: arrival.carrier } : d));
  }, [arrivals, docks]);

  const rejectCheckIn = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "departed" as DriverStatus } : a));
  }, []);

  const markLoadingStarted = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "loading" as DriverStatus } : a));
  }, []);

  const markLoadingComplete = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "completed" as DriverStatus } : a));
  }, []);

  const markDeparture = useCallback((arrivalId: string) => {
    setArrivals((prev) => {
      const arrival = prev.find((a) => a.id === arrivalId);
      if (arrival?.assignedDock) {
        setDocks((dp) => dp.map((d) => d.name === `Dock ${arrival.assignedDock}` ? { ...d, status: "available" as DockStatus, assignedDriverName: undefined, assignedLoadNumber: undefined, assignedCarrier: undefined } : d));
      }
      return prev.map((a) => a.id === arrivalId ? { ...a, status: "departed" as DriverStatus } : a);
    });
  }, []);

  const pendingCount = arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")).length;

  return (
    <Ctx.Provider value={{ arrivals, docks, pendingCount, approveCheckIn, rejectCheckIn, markLoadingStarted, markLoadingComplete, markDeparture }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWarehouse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWarehouse must be inside WarehouseProvider");
  return ctx;
}
