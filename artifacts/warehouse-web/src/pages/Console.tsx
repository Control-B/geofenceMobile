import { useState, useMemo } from "react";
import { CheckCircle, XCircle, Package, LogOut, CheckCheck, Anchor, FileText, AlertTriangle, PenTool, Clock, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useWarehouse, type Arrival, type DocType, type ArrivalDocument } from "@/context/WarehouseContext";

function timeAgo(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function fmtTime(d: Date) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

const DOC_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  uploaded:        { bg: "rgba(107,122,158,0.15)", text: "#94A3B8" },
  needs_driver_sig:{ bg: "rgba(245,158,11,0.15)",  text: "#FBBF24" },
  needs_clerk_sig: { bg: "rgba(139,92,246,0.18)",  text: "#A78BFA" },
  fully_signed:    { bg: "rgba(16,185,129,0.18)",  text: "#34D399" },
  rejected:        { bg: "rgba(239,68,68,0.15)",   text: "#F87171" },
  completed:       { bg: "rgba(16,185,129,0.18)",  text: "#34D399" },
};
const DOC_STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded", needs_driver_sig: "Driver Must Sign", needs_clerk_sig: "Needs Your Sig",
  fully_signed: "Fully Signed", rejected: "Rejected", completed: "Complete",
};
const DOC_TYPE_LABEL: Record<DocType, string> = {
  BOL: "BOL", POD: "POD", rate_confirmation: "Rate Conf", appointment_confirmation: "Appt Conf",
  lumper_receipt: "Lumper", custom: "Custom",
};

// ─── Doc Panel (inside active card) ──────────────────────────────────────────

function DocPanel({ docs, onClerkSign, onRequestDoc, arrivalId }: {
  docs: ArrivalDocument[];
  onClerkSign: (docId: string) => void;
  onRequestDoc: (arrivalId: string, type: DocType) => void;
  arrivalId: string;
}) {
  const [showRequest, setShowRequest] = useState(false);

  const REQUEST_OPTIONS: { type: DocType; label: string }[] = [
    { type: "BOL", label: "Bill of Lading" },
    { type: "POD", label: "Proof of Delivery" },
    { type: "lumper_receipt", label: "Lumper Receipt" },
    { type: "appointment_confirmation", label: "Appt Confirmation" },
  ];

  if (docs.length === 0 && !showRequest) {
    return (
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#6B7A9E]">No documents</span>
        <button onClick={() => setShowRequest(true)} className="flex items-center gap-1.5 text-xs text-[#A78BFA] hover:text-violet-300 transition-colors">
          <Plus size={12} /> Request Doc
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7A9E]">Documents</span>
        <button onClick={() => setShowRequest(!showRequest)} className="flex items-center gap-1 text-[10px] text-[#A78BFA] hover:text-violet-300 transition-colors">
          <Plus size={10} /> Request
        </button>
      </div>

      {showRequest && (
        <div className="bg-[#0D1117] border border-[#1E2640] rounded-lg p-2 space-y-1">
          <p className="text-[10px] text-[#6B7A9E] mb-1.5">Request missing document:</p>
          {REQUEST_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { onRequestDoc(arrivalId, opt.type); setShowRequest(false); }}
              className="w-full text-left text-xs text-[#E2E8F0] hover:text-white px-2 py-1 rounded hover:bg-[#1E2640] transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {docs.map((doc) => {
        const sc = DOC_STATUS_COLOR[doc.status] ?? DOC_STATUS_COLOR.uploaded;
        const canSign = doc.status === "needs_clerk_sig";
        return (
          <div key={doc.id} className="flex items-center gap-2">
            <FileText size={11} className="text-[#6B7A9E] flex-shrink-0" />
            <span className="text-xs text-[#E2E8F0] flex-1 truncate">{doc.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>
              {DOC_STATUS_LABEL[doc.status]}
            </span>
            {canSign && (
              <button
                onClick={() => onClerkSign(doc.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold hover:bg-violet-400 transition-colors flex-shrink-0"
              >
                <PenTool size={9} /> Sign
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Dock Picker Modal ────────────────────────────────────────────────────────

function DockPickerModal({ onPick, onClose, availDocks }: {
  onPick: (id: string) => void;
  onClose: () => void;
  availDocks: { id: string; name: string }[];
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#161B27] border border-[#1E2640] rounded-2xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Select Available Dock</h3>
        <p className="text-sm text-[#6B7A9E] mb-4">{availDocks.length} docks available</p>
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
          {availDocks.map((d) => (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              className="bg-violet-500/15 border border-violet-500/30 rounded-xl py-3 text-sm font-bold text-violet-300 hover:bg-violet-500/25 transition-colors"
            >
              {d.name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-[#1E2640] text-[#A8B3CF] text-sm font-medium hover:bg-[#252D47] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Sign Confirmation Modal ──────────────────────────────────────────────────

function SignConfirmModal({ doc, onConfirm, onClose }: {
  doc: ArrivalDocument;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const now = new Date();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#161B27] border border-[#1E2640] rounded-2xl p-6 w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <PenTool size={18} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Countersign Document</h3>
            <p className="text-xs text-[#6B7A9E]">{doc.name}</p>
          </div>
        </div>

        <div className="bg-[#0D1117] border border-[#1E2640] rounded-xl p-4 space-y-2.5 mb-4 text-sm">
          {[
            { label: "Signer", val: "Warehouse Clerk" },
            { label: "Role", val: "Warehouse Clerk" },
            { label: "Date", val: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
            { label: "Time", val: fmtTime(now) },
            { label: "Document", val: doc.name },
            { label: "Driver Signed", val: doc.driverSigned ? "Yes ✓" : "No" },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[#6B7A9E] text-xs">{label}</span>
              <span className="text-[#E2E8F0] text-xs font-medium">{val}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#6B7A9E] text-center mb-4">
          By confirming, you authorize this countersignature as the Warehouse Clerk for this load.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#1E2640] text-[#A8B3CF] text-sm font-medium hover:bg-[#252D47] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
          >
            <PenTool size={14} /> Countersign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Card ─────────────────────────────────────────────────────────────

function PendingCard({ arrival, docs, onApprove, onReject, onClerkSign, onRequestDoc }: {
  arrival: Arrival;
  docs: ArrivalDocument[];
  onApprove: () => void;
  onReject: () => void;
  onClerkSign: (docId: string) => void;
  onRequestDoc: (arrivalId: string, type: DocType) => void;
}) {
  const isLate = arrival.arrivalTime > arrival.appointmentTime;
  const docCount = docs.length;
  const needsClerkSig = docs.filter((d) => d.status === "needs_clerk_sig").length;

  return (
    <div className="bg-[#161B27] border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Awaiting Approval</span>
        <span className="text-xs text-[#6B7A9E]">{timeAgo(arrival.arrivalTime)}</span>
      </div>
      <div className="text-sm font-bold text-white mt-2">{arrival.driverName}</div>
      <div className="text-xs text-[#6B7A9E] mt-0.5">{arrival.carrier}</div>
      <div className="flex gap-4 mt-2 text-xs text-[#A8B3CF] flex-wrap">
        <span>Load: <span className="font-semibold text-[#E2E8F0]">{arrival.loadNumber}</span></span>
        <span>Trailer: <span className="font-semibold text-[#E2E8F0]">{arrival.trailerNumber}</span></span>
        <span className={isLate ? "text-red-400 font-semibold" : ""}>{fmtTime(arrival.appointmentTime)}{isLate ? " LATE" : ""}</span>
      </div>
      {arrival.notes && <div className="mt-2 text-xs text-[#6B7A9E] italic">{arrival.notes}</div>}

      {docCount > 0 && (
        <DocPanel docs={docs} onClerkSign={onClerkSign} onRequestDoc={onRequestDoc} arrivalId={arrival.id} />
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onReject} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/12 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors">
          <XCircle size={14} /> Reject
        </button>
        <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#7C3AED] transition-colors">
          <Anchor size={14} /> Approve & Assign Dock
        </button>
      </div>
    </div>
  );
}

// ─── Active Card ──────────────────────────────────────────────────────────────

function ActiveCard({ arrival, docs, onAction, onClerkSign, onRequestDoc }: {
  arrival: Arrival;
  docs: ArrivalDocument[];
  onAction: () => void;
  onClerkSign: (docId: string) => void;
  onRequestDoc: (arrivalId: string, type: DocType) => void;
}) {
  const actionLabel =
    ["dock_assigned", "at_dock"].includes(arrival.status) ? "Start Loading" :
    ["loading", "unloading"].includes(arrival.status) ? "Mark Complete" :
    arrival.status === "completed" ? "Mark Departed" : null;

  const ActionIcon =
    arrival.status === "completed" ? LogOut :
    ["loading", "unloading"].includes(arrival.status) ? CheckCheck : Package;

  const needsClerkSig = docs.filter((d) => d.status === "needs_clerk_sig").length;

  return (
    <div className="bg-[#161B27] border border-[#1E2640] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={arrival.status} size="sm" />
        <div className="flex items-center gap-2">
          {needsClerkSig > 0 && (
            <span className="flex items-center gap-1 text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-semibold">
              <AlertTriangle size={9} /> {needsClerkSig} doc{needsClerkSig > 1 ? "s" : ""} need sig
            </span>
          )}
          <span className="text-xs text-[#6B7A9E]">{timeAgo(arrival.arrivalTime)}</span>
        </div>
      </div>
      <div className="text-sm font-bold text-white">{arrival.driverName}</div>
      <div className="text-xs text-[#6B7A9E] mt-0.5">{arrival.carrier}</div>
      <div className="flex gap-3 mt-2 text-xs flex-wrap">
        <span className="text-[#A8B3CF]">Load: <span className="font-semibold text-[#E2E8F0]">{arrival.loadNumber}</span></span>
        {arrival.assignedDock && <span className="text-[#A8B3CF]">Dock: <span className="font-bold text-blue-400">{arrival.assignedDock}</span></span>}
        <span className="text-[#A8B3CF]">Wait: <span className="font-semibold text-[#E2E8F0]">{arrival.waitingMinutes}m</span></span>
      </div>

      <DocPanel docs={docs} onClerkSign={onClerkSign} onRequestDoc={onRequestDoc} arrivalId={arrival.id} />

      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1E2640] text-[#E2E8F0] text-xs font-semibold hover:bg-[#252D47] transition-colors border border-[#252D47]"
        >
          <ActionIcon size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Main Console ─────────────────────────────────────────────────────────────

export default function Console() {
  const { arrivals, docks, documents, approveCheckIn, rejectCheckIn, markLoadingStarted, markLoadingComplete, markDeparture, clerkSignDocument, requestDocument } = useWarehouse();
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [signDoc, setSignDoc] = useState<ArrivalDocument | null>(null);

  const pending = useMemo(() => arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")), [arrivals]);
  const active = useMemo(() => arrivals.filter((a) => a.checkedIn && !["completed", "departed"].includes(a.status)), [arrivals]);
  const availDocks = useMemo(() => docks.filter((d) => d.status === "available"), [docks]);

  const getArrivalDocs = (arrivalId: string) => documents.filter((d) => d.arrivalId === arrivalId);

  const totalNeedsClerkSig = useMemo(() => documents.filter((d) => d.status === "needs_clerk_sig").length, [documents]);

  const handleAction = (arrival: Arrival) => {
    if (["dock_assigned", "at_dock"].includes(arrival.status)) markLoadingStarted(arrival.id);
    else if (["loading", "unloading"].includes(arrival.status)) markLoadingComplete(arrival.id);
    else if (arrival.status === "completed") markDeparture(arrival.id);
  };

  const handlePickDock = (dockId: string) => {
    if (!pickerId) return;
    approveCheckIn(pickerId, dockId);
    setPickerId(null);
  };

  const handleClerkSign = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) setSignDoc(doc);
  };

  // Doc stats
  const docStats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((d) => d.status === "needs_driver_sig").length,
    needsClerк: documents.filter((d) => d.status === "needs_clerk_sig").length,
    signed: documents.filter((d) => d.status === "fully_signed" || d.status === "completed").length,
  }), [documents]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E2640] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Check-In Console</h1>
            <p className="text-sm text-[#6B7A9E] mt-0.5">
              {pending.length} pending approval · {active.length} active · {totalNeedsClerkSig > 0 ? <span className="text-violet-400 font-semibold">{totalNeedsClerkSig} docs need your signature</span> : "all docs up to date"}
            </p>
          </div>
          {/* Doc summary pills */}
          <div className="flex gap-2">
            {[
              { label: "Total Docs", val: docStats.total, color: "text-[#E2E8F0]", bg: "bg-[#1E2640]" },
              { label: "Driver Pending", val: docStats.pending, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Needs Clerk Sig", val: docStats.needsClerк, color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Fully Signed", val: docStats.signed, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-[#1E2640] rounded-xl px-3 py-2 text-center`}>
                <div className={`text-lg font-bold leading-tight ${s.color}`}>{s.val}</div>
                <div className="text-[10px] text-[#6B7A9E] mt-0.5 whitespace-nowrap">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Pending column */}
        <div className="w-80 flex-shrink-0 border-r border-[#1E2640] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2640] flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7A9E]">Pending Approval</span>
            {pending.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#6B7A9E] text-sm">
                <CheckCircle size={28} className="mb-2 opacity-40" />
                All caught up
              </div>
            ) : (
              pending.map((a) => (
                <PendingCard
                  key={a.id}
                  arrival={a}
                  docs={getArrivalDocs(a.id)}
                  onApprove={() => availDocks.length > 0 && setPickerId(a.id)}
                  onReject={() => rejectCheckIn(a.id)}
                  onClerkSign={handleClerkSign}
                  onRequestDoc={requestDocument}
                />
              ))
            )}
          </div>
        </div>

        {/* Active column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2640] flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7A9E]">Active · {active.length}</span>
            {totalNeedsClerkSig > 0 && (
              <span className="flex items-center gap-1.5 text-xs bg-violet-500/15 text-violet-300 px-2.5 py-1 rounded-full font-semibold">
                <AlertTriangle size={11} /> {totalNeedsClerkSig} document{totalNeedsClerkSig !== 1 ? "s" : ""} awaiting your countersignature
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {active.map((a) => (
                <ActiveCard
                  key={a.id}
                  arrival={a}
                  docs={getArrivalDocs(a.id)}
                  onAction={() => handleAction(a)}
                  onClerkSign={handleClerkSign}
                  onRequestDoc={requestDocument}
                />
              ))}
              {active.length === 0 && (
                <div className="col-span-full flex items-center justify-center h-32 text-[#6B7A9E] text-sm">No active drivers</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pickerId && (
        <DockPickerModal
          availDocks={availDocks}
          onPick={handlePickDock}
          onClose={() => setPickerId(null)}
        />
      )}

      {signDoc && (
        <SignConfirmModal
          doc={signDoc}
          onConfirm={() => clerkSignDocument(signDoc.id)}
          onClose={() => setSignDoc(null)}
        />
      )}
    </div>
  );
}
