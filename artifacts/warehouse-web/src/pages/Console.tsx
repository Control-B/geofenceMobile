import { useState, useMemo } from "react";
import { CheckCircle, XCircle, Package, LogOut, CheckCheck, Anchor } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useWarehouse, type Arrival } from "@/context/WarehouseContext";

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

function DockPickerModal({ onPick, onClose, availDocks }: { onPick: (id: string) => void; onClose: () => void; availDocks: { id: string; name: string }[] }) {
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

function PendingCard({ arrival, onApprove, onReject }: { arrival: Arrival; onApprove: () => void; onReject: () => void }) {
  const isLate = arrival.arrivalTime > arrival.appointmentTime;
  return (
    <div className="bg-[#161B27] border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Awaiting Approval</span>
        <span className="text-xs text-[#6B7A9E]">{timeAgo(arrival.arrivalTime)}</span>
      </div>
      <div className="text-sm font-bold text-white mt-2">{arrival.driverName}</div>
      <div className="text-xs text-[#6B7A9E] mt-0.5">{arrival.carrier}</div>
      <div className="flex gap-4 mt-2 text-xs text-[#A8B3CF]">
        <span>Load: <span className="font-semibold text-[#E2E8F0]">{arrival.loadNumber}</span></span>
        <span>Trailer: <span className="font-semibold text-[#E2E8F0]">{arrival.trailerNumber}</span></span>
        <span className={isLate ? "text-red-400 font-semibold" : ""}>Appt: {fmtTime(arrival.appointmentTime)}{isLate ? " LATE" : ""}</span>
      </div>
      {arrival.notes && <div className="mt-2 text-xs text-[#6B7A9E] italic">{arrival.notes}</div>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/12 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
        >
          <XCircle size={14} /> Reject
        </button>
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#7C3AED] transition-colors"
        >
          <Anchor size={14} /> Approve & Assign Dock
        </button>
      </div>
    </div>
  );
}

function ActiveCard({ arrival, onAction }: { arrival: Arrival; onAction: (id: string) => void }) {
  const actionLabel =
    ["dock_assigned", "at_dock"].includes(arrival.status) ? "Start Loading" :
    ["loading", "unloading"].includes(arrival.status) ? "Mark Complete" :
    arrival.status === "completed" ? "Mark Departed" : null;

  const ActionIcon = arrival.status === "completed" ? LogOut :
    ["loading", "unloading"].includes(arrival.status) ? CheckCheck : Package;

  return (
    <div className="bg-[#161B27] border border-[#1E2640] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={arrival.status} size="sm" />
        <span className="text-xs text-[#6B7A9E]">{timeAgo(arrival.arrivalTime)}</span>
      </div>
      <div className="text-sm font-bold text-white">{arrival.driverName}</div>
      <div className="text-xs text-[#6B7A9E] mt-0.5">{arrival.carrier}</div>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="text-[#A8B3CF]">Load: <span className="font-semibold text-[#E2E8F0]">{arrival.loadNumber}</span></span>
        {arrival.assignedDock && <span className="text-[#A8B3CF]">Dock: <span className="font-bold text-blue-400">{arrival.assignedDock}</span></span>}
        <span className="text-[#A8B3CF]">Wait: <span className="font-semibold text-[#E2E8F0]">{arrival.waitingMinutes}m</span></span>
      </div>
      {actionLabel && (
        <button
          onClick={() => onAction(arrival.id)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1E2640] text-[#E2E8F0] text-xs font-semibold hover:bg-[#252D47] transition-colors border border-[#252D47]"
        >
          <ActionIcon size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function Console() {
  const { arrivals, docks, approveCheckIn, rejectCheckIn, markLoadingStarted, markLoadingComplete, markDeparture } = useWarehouse();
  const [pickerId, setPickerId] = useState<string | null>(null);

  const pending = useMemo(() => arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")), [arrivals]);
  const active = useMemo(() => arrivals.filter((a) => a.checkedIn && !["completed", "departed"].includes(a.status)), [arrivals]);
  const availDocks = useMemo(() => docks.filter((d) => d.status === "available"), [docks]);

  const handleAction = (arrival: Arrival) => {
    if (["dock_assigned", "at_dock"].includes(arrival.status)) markLoadingStarted(arrival.id);
    else if (["loading", "unloading"].includes(arrival.status)) markLoadingComplete(arrival.id);
    else if (arrival.status === "completed") markDeparture(arrival.id);
  };

  const handleApprove = (id: string) => {
    if (availDocks.length === 0) return;
    setPickerId(id);
  };

  const handlePickDock = (dockId: string) => {
    if (!pickerId) return;
    approveCheckIn(pickerId, dockId);
    setPickerId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E2640] flex-shrink-0">
        <h1 className="text-xl font-bold text-white">Check-In Console</h1>
        <p className="text-sm text-[#6B7A9E] mt-0.5">{pending.length} pending approval · {active.length} active</p>
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
                  onApprove={() => handleApprove(a.id)}
                  onReject={() => rejectCheckIn(a.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Active column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2640]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7A9E]">Active · {active.length}</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {active.map((a) => (
                <ActiveCard key={a.id} arrival={a} onAction={() => handleAction(a)} />
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
    </div>
  );
}
