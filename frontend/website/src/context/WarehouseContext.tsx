import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getLoads, assignDock as apiAssignDock, patchStatus } from "@/services/arrivalService";
import { getDocuments, clerkSign as apiClerkSign } from "@/services/documentService";

export type DriverStatus =
  | "en_route" | "arrived" | "checked_in" | "waiting"
  | "dock_assigned" | "at_dock" | "loading" | "unloading"
  | "completed" | "departed";

export type DockStatus = "available" | "reserved" | "occupied" | "delayed" | "out_of_service";

export type DocType = "BOL" | "POD" | "rate_confirmation" | "appointment_confirmation" | "lumper_receipt" | "custom";
export type DocStatus = "uploaded" | "needs_driver_sig" | "needs_clerk_sig" | "fully_signed" | "rejected" | "completed";
export type SignerRole = "Driver" | "Warehouse Clerk" | "Dispatcher" | "Receiver";

export interface DocSignature {
  id: string;
  signer: string;
  role: SignerRole;
  timestamp: Date;
  fieldType: "signature" | "initials" | "name";
  signatureType: "drawn" | "typed";
}

export interface ArrivalDocument {
  id: string;
  arrivalId: string;
  type: DocType;
  name: string;
  status: DocStatus;
  uploadedAt: Date;
  requiresDriverSig: boolean;
  requiresClerkSig: boolean;
  driverSigned: boolean;
  clerkSigned: boolean;
  signatures: DocSignature[];
}

export interface Arrival {
  id: string;
  driverName: string;
  carrier: string;
  truckNumber: string;
  trailerNumber: string;
  driverPhone: string;
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
  documents: ArrivalDocument[];
  pendingCount: number;
  approveCheckIn: (arrivalId: string, dockId: string) => void;
  rejectCheckIn: (arrivalId: string) => void;
  markLoadingStarted: (arrivalId: string) => void;
  markLoadingComplete: (arrivalId: string) => void;
  markDeparture: (arrivalId: string) => void;
  clerkSignDocument: (docId: string) => void;
  requestDocument: (arrivalId: string, docType: DocType) => void;
}

function minsAgo(m: number) { return new Date(Date.now() - m * 60000); }
function todayAt(h: number, m = 0) { const d = new Date(); d.setHours(h, m, 0, 0); return d; }
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const INIT_ARRIVALS: Arrival[] = [
  { id: "a1", driverName: "Sarah Chen", carrier: "FastFreight LLC", truckNumber: "IL-2934", trailerNumber: "T-4521", driverPhone: "(312) 555-0192", loadNumber: "LD-771204", referenceNumber: "REF-334512", arrivalTime: minsAgo(45), appointmentTime: todayAt(10, 0), status: "at_dock", assignedDock: "14", waitingMinutes: 45, notes: "Refrigerated — Dock 14 only", checkedIn: true, instructions: "Dock 14, north entrance" },
  { id: "a2", driverName: "Mike Thompson", carrier: "Cornerstone Logistics", truckNumber: "OH-8821", trailerNumber: "T-6634", driverPhone: "(614) 555-0378", loadNumber: "LD-903881", referenceNumber: "REF-556782", arrivalTime: minsAgo(8), appointmentTime: todayAt(10, 30), status: "checked_in", waitingMinutes: 8, notes: "", checkedIn: true },
  { id: "a3", driverName: "David Kim", carrier: "Apex Carriers", truckNumber: "TX-1109", trailerNumber: "T-2211", driverPhone: "(214) 555-0561", loadNumber: "LD-556732", referenceNumber: "REF-778901", arrivalTime: minsAgo(52), appointmentTime: todayAt(9, 30), status: "loading", assignedDock: "08", waitingMinutes: 52, notes: "Heavy machinery — forklift required", checkedIn: true },
  { id: "a4", driverName: "Lisa Rodriguez", carrier: "Mountain West Freight", truckNumber: "CO-7743", trailerNumber: "T-8890", driverPhone: "(303) 555-0844", loadNumber: "LD-443215", referenceNumber: "REF-112234", arrivalTime: minsAgo(15), appointmentTime: todayAt(10, 30), status: "dock_assigned", assignedDock: "22", waitingMinutes: 15, notes: "", checkedIn: true, instructions: "Proceed to Dock 22. Use west entrance." },
  { id: "a5", driverName: "Amanda Foster", carrier: "ClearPath Logistics", truckNumber: "GA-5567", trailerNumber: "T-3378", driverPhone: "(404) 555-0227", loadNumber: "LD-991023", referenceNumber: "REF-990123", arrivalTime: minsAgo(5), appointmentTime: todayAt(11, 30), status: "arrived", waitingMinutes: 5, notes: "", checkedIn: false },
  { id: "a6", driverName: "Robert Wilson", carrier: "Lakefront Transport", truckNumber: "MI-3301", trailerNumber: "T-1145", driverPhone: "(313) 555-0619", loadNumber: "LD-667891", referenceNumber: "REF-445678", arrivalTime: minsAgo(72), appointmentTime: todayAt(9, 0), status: "completed", assignedDock: "06", waitingMinutes: 72, notes: "", checkedIn: true },
  { id: "a7", driverName: "Jennifer Walsh", carrier: "Sunrise Carriers", truckNumber: "FL-4423", trailerNumber: "T-5512", driverPhone: "(407) 555-0933", loadNumber: "LD-334892", referenceNumber: "REF-889012", arrivalTime: minsAgo(3), appointmentTime: todayAt(11, 15), status: "arrived", waitingMinutes: 3, notes: "Two pallets, oversized", checkedIn: false },
  { id: "a8", driverName: "Carlos Nguyen", carrier: "Pacific Bridge Trucking", truckNumber: "CA-8834", trailerNumber: "T-7721", driverPhone: "(415) 555-0415", loadNumber: "LD-224567", referenceNumber: "REF-334455", arrivalTime: minsAgo(0), appointmentTime: todayAt(11, 0), status: "en_route", waitingMinutes: 0, notes: "", checkedIn: false },
  { id: "a9", driverName: "Priya Patel", carrier: "Velocity Freight", truckNumber: "NY-5521", trailerNumber: "T-9001", driverPhone: "(917) 555-0782", loadNumber: "LD-112398", referenceNumber: "REF-667221", arrivalTime: minsAgo(2), appointmentTime: todayAt(11, 45), status: "arrived", waitingMinutes: 2, notes: "Fragile — glass products", checkedIn: false },
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

const INIT_DOCUMENTS: ArrivalDocument[] = [
  { id: "doc-a1-1", arrivalId: "a1", type: "BOL", name: "Bill of Lading", status: "needs_clerk_sig", uploadedAt: minsAgo(40), requiresDriverSig: true, requiresClerkSig: true, driverSigned: true, clerkSigned: false, signatures: [{ id: "s1", signer: "Sarah Chen", role: "Driver", timestamp: minsAgo(35), fieldType: "signature", signatureType: "typed" }] },
  { id: "doc-a1-2", arrivalId: "a1", type: "POD", name: "Proof of Delivery", status: "needs_driver_sig", uploadedAt: minsAgo(20), requiresDriverSig: true, requiresClerkSig: true, driverSigned: false, clerkSigned: false, signatures: [] },
  { id: "doc-a2-1", arrivalId: "a2", type: "BOL", name: "Bill of Lading", status: "needs_driver_sig", uploadedAt: minsAgo(6), requiresDriverSig: true, requiresClerkSig: true, driverSigned: false, clerkSigned: false, signatures: [] },
  { id: "doc-a3-1", arrivalId: "a3", type: "BOL", name: "Bill of Lading", status: "needs_clerk_sig", uploadedAt: minsAgo(50), requiresDriverSig: true, requiresClerkSig: true, driverSigned: true, clerkSigned: false, signatures: [{ id: "s3", signer: "David Kim", role: "Driver", timestamp: minsAgo(45), fieldType: "signature", signatureType: "drawn" }] },
  { id: "doc-a3-2", arrivalId: "a3", type: "lumper_receipt", name: "Lumper Receipt", status: "uploaded", uploadedAt: minsAgo(30), requiresDriverSig: false, requiresClerkSig: false, driverSigned: false, clerkSigned: false, signatures: [] },
  { id: "doc-a4-1", arrivalId: "a4", type: "BOL", name: "Bill of Lading", status: "uploaded", uploadedAt: minsAgo(12), requiresDriverSig: true, requiresClerkSig: true, driverSigned: false, clerkSigned: false, signatures: [] },
];

const Ctx = createContext<WarehouseContextType | undefined>(undefined);

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [arrivals, setArrivals] = useState<Arrival[]>(INIT_ARRIVALS);
  const [docks, setDocks] = useState<Dock[]>(INIT_DOCKS);
  const [documents, setDocuments] = useState<ArrivalDocument[]>(INIT_DOCUMENTS);

  // Load arrivals from API on mount (non-breaking — mock data stays until API responds)
  useEffect(() => {
    getLoads().then((loads) => {
      setArrivals(loads.map((l) => ({
        id: l.id,
        driverName: l.driverName ?? "—",
        carrier: l.carrier ?? "—",
        truckNumber: l.truckNumber ?? "—",
        trailerNumber: l.trailerNumber ?? "—",
        driverPhone: l.driverPhone ?? "—",
        loadNumber: l.loadNumber,
        referenceNumber: l.referenceNumber ?? "",
        arrivalTime: l.arrivedTime ? new Date(l.arrivedTime) : new Date(),
        appointmentTime: l.appointmentTime ? new Date(l.appointmentTime) : new Date(),
        status: (l.status as DriverStatus) ?? "en_route",
        assignedDock: l.dockAssignment,
        waitingMinutes: l.arrivedTime ? Math.floor((Date.now() - new Date(l.arrivedTime).getTime()) / 60000) : 0,
        checkedIn: !!l.checkInTime,
        instructions: l.instructions,
      })));
    }).catch(() => {}); // keep mock data on error
  }, []);

  // Sync documents when arrivals change (merge API docs with mock)
  useEffect(() => {
    const realIds = arrivals.filter((a) => /^[0-9a-f]{8}-/.test(a.id));
    if (realIds.length === 0) return;
    Promise.all(realIds.map((a) => getDocuments(a.id).then((docs) => ({ arrivalId: a.id, docs })).catch(() => null)))
      .then((results) => {
        const apiDocs: ArrivalDocument[] = results.flatMap((r) => {
          if (!r) return [];
          return r.docs.map((d) => ({
            id: d.id,
            arrivalId: r.arrivalId,
            type: d.type as DocType,
            name: d.name,
            status: d.status as DocStatus,
            uploadedAt: new Date(d.createdAt),
            requiresDriverSig: d.requiresDriverSig,
            requiresClerkSig: d.requiresClerkSig,
            driverSigned: ["needs_clerk_sig", "fully_signed", "completed"].includes(d.status),
            clerkSigned: ["fully_signed", "completed"].includes(d.status),
            signatures: [],
          }));
        });
        if (apiDocs.length > 0) {
          setDocuments((prev) => {
            const mockOnly = prev.filter((d) => !/^[0-9a-f]{8}-/.test(d.id));
            return [...mockOnly, ...apiDocs];
          });
        }
      }).catch(() => {});
  }, [arrivals]);

  const approveCheckIn = useCallback((arrivalId: string, dockId: string) => {
    const arrival = arrivals.find((a) => a.id === arrivalId);
    const dock = docks.find((d) => d.id === dockId);
    if (!arrival || !dock) return;
    const dockNum = dock.name.replace("Dock ", "");
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "dock_assigned" as DriverStatus, assignedDock: dockNum, checkedIn: true, instructions: `Proceed to ${dock.name}. Use main entrance.` } : a));
    setDocks((p) => p.map((d) => d.id === dockId ? { ...d, status: "reserved" as DockStatus, assignedDriverName: arrival.driverName, assignedLoadNumber: arrival.loadNumber, assignedCarrier: arrival.carrier } : d));
    // Auto-add a BOL document for newly approved drivers
    setDocuments((prev) => {
      const existing = prev.find((d) => d.arrivalId === arrivalId);
      if (existing) return prev;
      return [...prev, { id: makeId(), arrivalId, type: "BOL", name: "Bill of Lading", status: "needs_driver_sig", uploadedAt: new Date(), requiresDriverSig: true, requiresClerkSig: true, driverSigned: false, clerkSigned: false, signatures: [] }];
    });
    // Persist to API if arrivalId is a real UUID
    if (/^[0-9a-f]{8}-/.test(arrivalId)) {
      apiAssignDock({ loadId: arrivalId, dockName: dock.name }).catch(() => {});
    }
  }, [arrivals, docks]);

  const rejectCheckIn = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "departed" as DriverStatus } : a));
    if (/^[0-9a-f]{8}-/.test(arrivalId)) {
      patchStatus(arrivalId, "departed").catch(() => {});
    }
  }, []);

  const markLoadingStarted = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "loading" as DriverStatus } : a));
    if (/^[0-9a-f]{8}-/.test(arrivalId)) {
      patchStatus(arrivalId, "loading").catch(() => {});
    }
  }, []);

  const markLoadingComplete = useCallback((arrivalId: string) => {
    setArrivals((p) => p.map((a) => a.id === arrivalId ? { ...a, status: "completed" as DriverStatus } : a));
    if (/^[0-9a-f]{8}-/.test(arrivalId)) {
      patchStatus(arrivalId, "completed").catch(() => {});
    }
  }, []);

  const markDeparture = useCallback((arrivalId: string) => {
    setArrivals((prev) => {
      const arrival = prev.find((a) => a.id === arrivalId);
      if (arrival?.assignedDock) {
        setDocks((dp) => dp.map((d) => d.name === `Dock ${arrival.assignedDock}` ? { ...d, status: "available" as DockStatus, assignedDriverName: undefined, assignedLoadNumber: undefined, assignedCarrier: undefined } : d));
      }
      return prev.map((a) => a.id === arrivalId ? { ...a, status: "departed" as DriverStatus } : a);
    });
    if (/^[0-9a-f]{8}-/.test(arrivalId)) {
      patchStatus(arrivalId, "departed").catch(() => {});
    }
  }, []);

  const clerkSignDocument = useCallback((docId: string) => {
    const now = new Date();
    setDocuments((prev) => prev.map((d) => {
      if (d.id !== docId) return d;
      const newSig: DocSignature = { id: makeId(), signer: "Warehouse Clerk", role: "Warehouse Clerk", timestamp: now, fieldType: "signature", signatureType: "typed" };
      return { ...d, clerkSigned: true, status: "fully_signed" as DocStatus, signatures: [...d.signatures, newSig] };
    }));
    if (/^[0-9a-f]{8}-/.test(docId)) {
      apiClerkSign(docId, { signatureData: "Warehouse Clerk", signatureType: "typed", fieldType: "signature" }).catch(() => {});
    }
  }, []);

  const requestDocument = useCallback((arrivalId: string, docType: DocType) => {
    const labels: Record<DocType, string> = { BOL: "Bill of Lading", POD: "Proof of Delivery", rate_confirmation: "Rate Confirmation", appointment_confirmation: "Appointment Confirmation", lumper_receipt: "Lumper Receipt", custom: "Custom Document" };
    setDocuments((prev) => [...prev, { id: makeId(), arrivalId, type: docType, name: labels[docType], status: "needs_driver_sig", uploadedAt: new Date(), requiresDriverSig: true, requiresClerkSig: docType === "BOL" || docType === "POD", driverSigned: false, clerkSigned: false, signatures: [] }]);
  }, []);

  const pendingCount = arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")).length;

  return (
    <Ctx.Provider value={{ arrivals, docks, documents, pendingCount, approveCheckIn, rejectCheckIn, markLoadingStarted, markLoadingComplete, markDeparture, clerkSignDocument, requestDocument }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWarehouse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWarehouse must be inside WarehouseProvider");
  return ctx;
}
