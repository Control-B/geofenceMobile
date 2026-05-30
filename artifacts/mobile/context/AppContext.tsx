import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type DriverStatus =
  | "en_route" | "arrived" | "checked_in" | "waiting"
  | "dock_assigned" | "at_dock" | "loading" | "unloading"
  | "completed" | "departed";

export type DockStatus =
  | "available" | "reserved" | "occupied" | "delayed" | "out_of_service";

export type DocType =
  | "BOL" | "POD" | "rate_confirmation" | "appointment_confirmation"
  | "lumper_receipt" | "custom";

export type DocStatus =
  | "uploaded" | "needs_driver_sig" | "needs_clerk_sig"
  | "fully_signed" | "rejected" | "completed";

export type SignerRole = "Driver" | "Warehouse Clerk" | "Dispatcher" | "Receiver";

export type SigFieldType = "signature" | "initials" | "name";

export interface DocumentSignature {
  id: string;
  signer: string;
  role: SignerRole;
  signatureData: string;
  signatureType: "drawn" | "typed";
  fieldType: SigFieldType;
  timestamp: Date;
  loadNumber: string;
  facility: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  signer: string;
  role: SignerRole;
  timestamp: Date;
  documentId: string;
  loadNumber: string;
  facility: string;
}

export interface LoadDocument {
  id: string;
  loadId: string;
  type: DocType;
  name: string;
  status: DocStatus;
  uploadedAt: Date;
  uploadedBy: string;
  signatures: DocumentSignature[];
  auditTrail: AuditEntry[];
  requiresDriverSig: boolean;
  requiresClerkSig: boolean;
  notes?: string;
  imageUri?: string;
  fileName?: string;
  captureMethod?: "camera" | "library" | "file";
}

export interface StatusEvent {
  status: DriverStatus;
  timestamp: Date;
}

export interface Load {
  id: string;
  carrier: string;
  pickupFacility: string;
  pickupAddress: string;
  deliveryFacility: string;
  deliveryAddress: string;
  appointmentTime: Date;
  trailerNumber: string;
  loadNumber: string;
  referenceNumber: string;
  poNumber: string;
  status: DriverStatus;
  eta: string;
  distance: string;
  dockAssignment?: string;
  queuePosition?: number;
  instructions?: string;
  arrivedTime?: Date;
  checkInTime?: Date;
  statusHistory: StatusEvent[];
}

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

export interface AppNotification {
  id: string;
  type: "dock_assigned" | "loading_ready" | "delay" | "gate" | "appointment" | "departure" | "arrival" | "document";
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

export interface CheckInFormData {
  trailerNumber: string;
  loadNumber: string;
  referenceNumber: string;
  poNumber: string;
  notes: string;
}

export interface CreateLoadData {
  carrier: string;
  pickupFacility: string;
  pickupAddress: string;
  deliveryFacility: string;
  deliveryAddress: string;
  loadNumber: string;
  referenceNumber: string;
  poNumber: string;
  trailerNumber: string;
  appointmentTime: Date;
}

interface AppContextType {
  role: "driver" | "warehouse" | null;
  roleLoaded: boolean;
  loads: Load[];
  activeLoadId: string;
  currentLoad: Load;
  arrivals: Arrival[];
  docks: Dock[];
  driverNotifications: AppNotification[];
  unreadCount: number;
  documents: LoadDocument[];
  driverName: string;
  setRole: (role: "driver" | "warehouse") => Promise<void>;
  clearRole: () => Promise<void>;
  createLoad: (data: CreateLoadData) => void;
  setActiveLoad: (id: string) => void;
  simulateArrival: () => void;
  submitCheckIn: (data: CheckInFormData) => void;
  approveCheckIn: (arrivalId: string, dockId: string) => void;
  rejectCheckIn: (arrivalId: string) => void;
  sendInstructions: (arrivalId: string, instructions: string) => void;
  markLoadingStarted: (arrivalId: string) => void;
  markLoadingComplete: (arrivalId: string) => void;
  markDeparture: (arrivalId: string) => void;
  markNotificationsRead: () => void;
  signDocument: (docId: string, data: { signatureData: string; signatureType: "drawn" | "typed"; fieldType: SigFieldType }) => void;
  addDocument: (type: DocType, opts?: { imageUri?: string; fileName?: string; captureMethod?: "camera" | "library" | "file"; name?: string }) => void;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function minutesAgo(mins: number): Date {
  return new Date(Date.now() - mins * 60 * 1000);
}

function todayAt(hour: number, min = 0): Date {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
}

const INITIAL_LOAD: Load = {
  id: "load-001",
  carrier: "Alliance Transport",
  pickupFacility: "Chicago Distribution Center",
  pickupAddress: "1400 W Lake St, Chicago, IL 60607",
  deliveryFacility: "Midwest Fulfillment Hub",
  deliveryAddress: "8800 Regal Row, Dallas, TX 75247",
  appointmentTime: todayAt(10, 30),
  trailerNumber: "T-9234",
  loadNumber: "LD-882341",
  referenceNumber: "REF-445521",
  poNumber: "PO-887234",
  status: "en_route",
  eta: "23 min",
  distance: "18.4 mi",
  statusHistory: [{ status: "en_route", timestamp: minutesAgo(95) }],
};

const INITIAL_ARRIVALS: Arrival[] = [
  { id: "arr-001", driverName: "Sarah Chen", carrier: "FastFreight LLC", truckNumber: "IL-2934", trailerNumber: "T-4521", loadNumber: "LD-771204", referenceNumber: "REF-334512", arrivalTime: minutesAgo(45), appointmentTime: todayAt(10, 0), status: "at_dock", assignedDock: "14", waitingMinutes: 45, notes: "Refrigerated — Dock 14 only", checkedIn: true, instructions: "Proceed to Dock 14. Refrigerated bay, use north entrance." },
  { id: "arr-002", driverName: "Mike Thompson", carrier: "Cornerstone Logistics", truckNumber: "OH-8821", trailerNumber: "T-6634", loadNumber: "LD-903881", referenceNumber: "REF-556782", arrivalTime: minutesAgo(8), appointmentTime: todayAt(10, 30), status: "checked_in", waitingMinutes: 8, notes: "", checkedIn: true },
  { id: "arr-003", driverName: "David Kim", carrier: "Apex Carriers", truckNumber: "TX-1109", trailerNumber: "T-2211", loadNumber: "LD-556732", referenceNumber: "REF-778901", arrivalTime: minutesAgo(52), appointmentTime: todayAt(9, 30), status: "loading", assignedDock: "08", waitingMinutes: 52, notes: "Heavy machinery — forklift required", checkedIn: true },
  { id: "arr-004", driverName: "Lisa Rodriguez", carrier: "Mountain West Freight", truckNumber: "CO-7743", trailerNumber: "T-8890", loadNumber: "LD-443215", referenceNumber: "REF-112234", arrivalTime: minutesAgo(15), appointmentTime: todayAt(10, 30), status: "dock_assigned", assignedDock: "22", waitingMinutes: 15, notes: "", checkedIn: true, instructions: "Proceed to Dock 22. Use west entrance." },
  { id: "arr-005", driverName: "Amanda Foster", carrier: "ClearPath Logistics", truckNumber: "GA-5567", trailerNumber: "T-3378", loadNumber: "LD-991023", referenceNumber: "REF-990123", arrivalTime: minutesAgo(5), appointmentTime: todayAt(11, 30), status: "arrived", waitingMinutes: 5, notes: "", checkedIn: false },
  { id: "arr-006", driverName: "Robert Wilson", carrier: "Lakefront Transport", truckNumber: "MI-3301", trailerNumber: "T-1145", loadNumber: "LD-667891", referenceNumber: "REF-445678", arrivalTime: minutesAgo(72), appointmentTime: todayAt(9, 0), status: "completed", assignedDock: "06", waitingMinutes: 72, notes: "", checkedIn: true },
  { id: "arr-007", driverName: "Jennifer Walsh", carrier: "Sunrise Carriers", truckNumber: "FL-4423", trailerNumber: "T-5512", loadNumber: "LD-334892", referenceNumber: "REF-889012", arrivalTime: minutesAgo(3), appointmentTime: todayAt(11, 15), status: "arrived", waitingMinutes: 3, notes: "Two pallets, oversized", checkedIn: false },
  { id: "arr-008", driverName: "Carlos Nguyen", carrier: "Pacific Bridge Trucking", truckNumber: "CA-8834", trailerNumber: "T-7721", loadNumber: "LD-224567", referenceNumber: "REF-334455", arrivalTime: minutesAgo(0), appointmentTime: todayAt(11, 0), status: "en_route", waitingMinutes: 0, notes: "", checkedIn: false },
];

const INITIAL_DOCKS: Dock[] = Array.from({ length: 24 }, (_, i) => {
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

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: "notif-001", type: "appointment", title: "Appointment Reminder", message: "Your appointment at Midwest Fulfillment Hub is in 30 minutes. ETA looks good.", time: minutesAgo(3), read: false },
  { id: "notif-002", type: "gate", title: "Gate Hours Updated", message: "Midwest Fulfillment Hub gate closes at 6:00 PM today.", time: minutesAgo(42), read: true },
  { id: "notif-003", type: "delay", title: "Facility Delay Notice", message: "Midwest Fulfillment Hub is experiencing congestion. Allow extra time for check-in.", time: minutesAgo(88), read: true },
];

const INITIAL_DOCUMENTS: LoadDocument[] = [
  {
    id: "doc-001",
    loadId: "load-001",
    type: "BOL",
    name: "Bill of Lading",
    status: "needs_driver_sig",
    uploadedAt: minutesAgo(30),
    uploadedBy: "Dispatch",
    signatures: [],
    auditTrail: [
      { id: "aud-001", action: "Document uploaded by Dispatch", signer: "Dispatch Team", role: "Dispatcher", timestamp: minutesAgo(30), documentId: "doc-001", loadNumber: "LD-882341", facility: "Midwest Fulfillment Hub" },
    ],
    requiresDriverSig: true,
    requiresClerkSig: true,
    notes: "Sign before unloading begins",
  },
  {
    id: "doc-002",
    loadId: "load-001",
    type: "rate_confirmation",
    name: "Rate Confirmation",
    status: "uploaded",
    uploadedAt: minutesAgo(95),
    uploadedBy: "Dispatch",
    signatures: [],
    auditTrail: [],
    requiresDriverSig: false,
    requiresClerkSig: false,
  },
  {
    id: "doc-003",
    loadId: "load-001",
    type: "appointment_confirmation",
    name: "Appointment Confirmation",
    status: "fully_signed",
    uploadedAt: minutesAgo(120),
    uploadedBy: "Dispatch",
    signatures: [
      { id: "sig-pre-001", signer: "Dispatch Team", role: "Dispatcher", signatureData: "Dispatch Team", signatureType: "typed", fieldType: "signature", timestamp: minutesAgo(90), loadNumber: "LD-882341", facility: "Midwest Fulfillment Hub" },
    ],
    auditTrail: [
      { id: "aud-002", action: "Signed by Dispatcher", signer: "Dispatch Team", role: "Dispatcher", timestamp: minutesAgo(90), documentId: "doc-003", loadNumber: "LD-882341", facility: "Midwest Fulfillment Hub" },
    ],
    requiresDriverSig: false,
    requiresClerkSig: false,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<"driver" | "warehouse" | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [loads, setLoads] = useState<Load[]>([INITIAL_LOAD]);
  const [activeLoadId, setActiveLoadId] = useState<string>(INITIAL_LOAD.id);
  const [arrivals, setArrivals] = useState<Arrival[]>(INITIAL_ARRIVALS);
  const [docks, setDocks] = useState<Dock[]>(INITIAL_DOCKS);
  const [driverNotifications, setDriverNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [documents, setDocuments] = useState<LoadDocument[]>(INITIAL_DOCUMENTS);

  const driverName = "James Morrison";

  // Derived: active load
  const currentLoad: Load = loads.find((l) => l.id === activeLoadId) ?? loads[0];

  // Helper: update only the currently-active load
  const updateActiveLoad = useCallback((updater: (prev: Load) => Load) => {
    setLoads((prev) => prev.map((l) => l.id === activeLoadId ? updater(l) : l));
  }, [activeLoadId]);

  useEffect(() => {
    AsyncStorage.getItem("@dockflow_role").then((saved) => {
      if (saved === "driver" || saved === "warehouse") setRoleState(saved);
      setRoleLoaded(true);
    });
  }, []);

  const setRole = useCallback(async (r: "driver" | "warehouse") => {
    await AsyncStorage.setItem("@dockflow_role", r);
    setRoleState(r);
  }, []);

  const clearRole = useCallback(async () => {
    await AsyncStorage.removeItem("@dockflow_role");
    setRoleState(null);
  }, []);

  const createLoad = useCallback((data: CreateLoadData) => {
    const id = makeId();
    const newLoad: Load = {
      id,
      carrier: data.carrier || "Independent",
      pickupFacility: data.pickupFacility || "—",
      pickupAddress: data.pickupAddress || "—",
      deliveryFacility: data.deliveryFacility,
      deliveryAddress: data.deliveryAddress,
      appointmentTime: data.appointmentTime,
      trailerNumber: data.trailerNumber || "—",
      loadNumber: data.loadNumber,
      referenceNumber: data.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      poNumber: data.poNumber || "—",
      status: "en_route",
      eta: "—",
      distance: "—",
      statusHistory: [{ status: "en_route", timestamp: new Date() }],
    };
    setLoads((prev) => [...prev, newLoad]);
    setActiveLoadId(id);
  }, []);

  const setActiveLoad = useCallback((id: string) => {
    setActiveLoadId(id);
  }, []);

  const simulateArrival = useCallback(() => {
    const now = new Date();
    const activeCount = arrivals.filter((a) => a.status !== "completed" && a.status !== "departed" && a.status !== "en_route").length;
    updateActiveLoad((prev) => ({
      ...prev,
      status: "arrived",
      arrivedTime: now,
      eta: "0 min",
      distance: "0 mi",
      queuePosition: activeCount + 1,
      statusHistory: [...prev.statusHistory, { status: "arrived", timestamp: now }],
    }));
    const newArrival: Arrival = {
      id: "arr-driver",
      driverName: "You (Driver)",
      carrier: currentLoad.carrier,
      truckNumber: "TX-9988",
      trailerNumber: currentLoad.trailerNumber,
      loadNumber: currentLoad.loadNumber,
      referenceNumber: currentLoad.referenceNumber,
      arrivalTime: now,
      appointmentTime: currentLoad.appointmentTime,
      status: "arrived",
      waitingMinutes: 0,
      notes: "",
      checkedIn: false,
    };
    setArrivals((prev) => [newArrival, ...prev.filter((a) => a.id !== "arr-driver")]);
    setDriverNotifications((prev) => [
      { id: makeId(), type: "arrival", title: "You Have Arrived", message: `Arrived at ${currentLoad.deliveryFacility}. Please proceed to check-in.`, time: now, read: false },
      ...prev,
    ]);
  }, [arrivals, currentLoad]);

  const submitCheckIn = useCallback((data: CheckInFormData) => {
    const now = new Date();
    updateActiveLoad((prev) => ({
      ...prev,
      status: "waiting",
      checkInTime: now,
      trailerNumber: data.trailerNumber || prev.trailerNumber,
      loadNumber: data.loadNumber || prev.loadNumber,
      referenceNumber: data.referenceNumber || prev.referenceNumber,
      poNumber: data.poNumber || prev.poNumber,
      statusHistory: [...prev.statusHistory, { status: "checked_in", timestamp: now }, { status: "waiting", timestamp: new Date(now.getTime() + 1) }],
    }));
    setArrivals((prev) =>
      prev.map((a) => a.id === "arr-driver" ? { ...a, status: "waiting" as DriverStatus, checkedIn: true, trailerNumber: data.trailerNumber || a.trailerNumber, loadNumber: data.loadNumber || a.loadNumber } : a)
    );
    setDriverNotifications((prev) => [
      { id: makeId(), type: "document", title: "Documents Ready", message: "Please review and sign your BOL and other required documents in the Documents tab.", time: new Date(now.getTime() + 2000), read: false },
      ...prev,
    ]);
  }, []);

  const approveCheckIn = useCallback((arrivalId: string, dockId: string) => {
    const arrival = arrivals.find((a) => a.id === arrivalId);
    const dock = docks.find((d) => d.id === dockId);
    if (!arrival || !dock) return;
    const dockName = dock.name;
    const dockNum = dock.name.replace("Dock ", "");
    const now = new Date();
    const instructions = `Proceed to ${dockName}. Use main entrance.`;
    setArrivals((prev) => prev.map((a) => a.id === arrivalId ? { ...a, status: "dock_assigned" as DriverStatus, assignedDock: dockNum, instructions } : a));
    setDocks((prev) => prev.map((d) => d.id === dockId ? { ...d, status: "reserved" as DockStatus, assignedDriverName: arrival.driverName, assignedLoadNumber: arrival.loadNumber, assignedCarrier: arrival.carrier } : d));
    if (arrivalId === "arr-driver") {
      updateActiveLoad((prev) => ({ ...prev, status: "dock_assigned" as DriverStatus, dockAssignment: dockNum, instructions, statusHistory: [...prev.statusHistory, { status: "dock_assigned", timestamp: now }] }));
      setDriverNotifications((prev) => [
        { id: makeId(), type: "dock_assigned", title: "Dock Assigned", message: `${instructions} Stand by for loading.`, time: now, read: false },
        ...prev,
      ]);
    }
  }, [arrivals, docks]);

  const rejectCheckIn = useCallback((arrivalId: string) => {
    setArrivals((prev) => prev.map((a) => a.id === arrivalId ? { ...a, status: "departed" as DriverStatus } : a));
  }, []);

  const sendInstructions = useCallback((arrivalId: string, instructions: string) => {
    setArrivals((prev) => prev.map((a) => a.id === arrivalId ? { ...a, instructions } : a));
    if (arrivalId === "arr-driver") updateActiveLoad((prev) => ({ ...prev, instructions }));
  }, []);

  const markLoadingStarted = useCallback((arrivalId: string) => {
    setArrivals((prev) => prev.map((a) => a.id === arrivalId ? { ...a, status: "loading" as DriverStatus } : a));
  }, []);

  const markLoadingComplete = useCallback((arrivalId: string) => {
    setArrivals((prev) => prev.map((a) => a.id === arrivalId ? { ...a, status: "completed" as DriverStatus } : a));
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

  const markNotificationsRead = useCallback(() => {
    setDriverNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const signDocument = useCallback((docId: string, data: { signatureData: string; signatureType: "drawn" | "typed"; fieldType: SigFieldType }) => {
    const now = new Date();
    const newSig: DocumentSignature = {
      id: makeId(),
      signer: driverName,
      role: "Driver",
      signatureData: data.signatureData,
      signatureType: data.signatureType,
      fieldType: data.fieldType,
      timestamp: now,
      loadNumber: currentLoad.loadNumber,
      facility: currentLoad.deliveryFacility,
    };
    const auditEntry: AuditEntry = {
      id: makeId(),
      action: `Signed as Driver (${data.fieldType})`,
      signer: driverName,
      role: "Driver",
      timestamp: now,
      documentId: docId,
      loadNumber: currentLoad.loadNumber,
      facility: currentLoad.deliveryFacility,
    };
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        const newSigs = [...doc.signatures, newSig];
        const newAudit = [...doc.auditTrail, auditEntry];
        const newStatus: DocStatus = doc.requiresClerkSig ? "needs_clerk_sig" : "fully_signed";
        return { ...doc, signatures: newSigs, auditTrail: newAudit, status: newStatus };
      })
    );
    setDriverNotifications((prev) => [
      { id: makeId(), type: "document", title: "Document Signed", message: "Your signature has been captured. Waiting for warehouse clerk countersignature.", time: now, read: false },
      ...prev,
    ]);
  }, [driverName, currentLoad]);

  const addDocument = useCallback((type: DocType, opts?: { imageUri?: string; fileName?: string; captureMethod?: "camera" | "library" | "file"; name?: string }) => {
    const labels: Record<DocType, string> = {
      BOL: "Bill of Lading",
      POD: "Proof of Delivery",
      rate_confirmation: "Rate Confirmation",
      appointment_confirmation: "Appointment Confirmation",
      lumper_receipt: "Lumper Receipt",
      custom: "Custom Document",
    };
    const needsSig = type === "BOL" || type === "POD" || type === "lumper_receipt";
    const now = new Date();
    const method = opts?.captureMethod;
    const captureLabel = method === "camera" ? "scanned via camera" : method === "library" ? "picked from library" : method === "file" ? "attached from files" : "uploaded";
    const newDoc: LoadDocument = {
      id: makeId(),
      loadId: currentLoad.id,
      type,
      name: opts?.name || labels[type],
      status: needsSig ? "needs_driver_sig" : "uploaded",
      uploadedAt: now,
      uploadedBy: driverName,
      signatures: [],
      auditTrail: [
        { id: makeId(), action: `Document ${captureLabel} by Driver`, signer: driverName, role: "Driver", timestamp: now, documentId: "", loadNumber: currentLoad.loadNumber, facility: currentLoad.deliveryFacility },
      ],
      requiresDriverSig: needsSig,
      requiresClerkSig: type === "BOL" || type === "POD",
      imageUri: opts?.imageUri,
      fileName: opts?.fileName,
      captureMethod: opts?.captureMethod,
    };
    setDocuments((prev) => [...prev, newDoc]);
  }, [currentLoad, driverName]);

  const unreadCount = driverNotifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        role, roleLoaded, loads, activeLoadId, currentLoad, arrivals, docks, driverNotifications, unreadCount,
        documents, driverName,
        setRole, clearRole, createLoad, setActiveLoad, simulateArrival, submitCheckIn, approveCheckIn, rejectCheckIn,
        sendInstructions, markLoadingStarted, markLoadingComplete, markDeparture,
        markNotificationsRead, signDocument, addDocument,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
