import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useWarehouse, type Arrival, type DriverStatus } from "@/context/WarehouseContext";

type Filter = "all" | "pending" | "waiting" | "active" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "waiting", label: "Waiting" },
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

function filterMatch(a: Arrival, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "pending") return !a.checkedIn && (a.status === "arrived" || a.status === "en_route");
  if (f === "waiting") return a.status === "waiting" || a.status === "checked_in";
  if (f === "active") return ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status);
  if (f === "done") return a.status === "completed" || a.status === "departed";
  return true;
}

function fmtTime(d: Date) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

function timeAgo(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function isLate(arrival: Date, appt: Date, status: DriverStatus) {
  return arrival > appt && !["completed", "departed", "en_route"].includes(status);
}

export default function Queue() {
  const { arrivals } = useWarehouse();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return arrivals.filter((a) => {
      if (!filterMatch(a, filter)) return false;
      if (!q) return true;
      return a.driverName.toLowerCase().includes(q) || a.carrier.toLowerCase().includes(q) || a.loadNumber.toLowerCase().includes(q) || a.trailerNumber.toLowerCase().includes(q) || a.truckNumber.toLowerCase().includes(q) || a.driverPhone.toLowerCase().includes(q);
    });
  }, [arrivals, search, filter]);

  const counts = useMemo(() => ({
    total: arrivals.length,
    pending: arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")).length,
    active: arrivals.filter((a) => ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status)).length,
    done: arrivals.filter((a) => a.status === "completed" || a.status === "departed").length,
  }), [arrivals]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E2640] flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Arrivals Queue</h1>
            <p className="text-sm text-[#6B7A9E] mt-0.5">{counts.total} drivers tracked today</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total", val: counts.total, color: "text-white" },
              { label: "Pending", val: counts.pending, color: "text-amber-400" },
              { label: "Active", val: counts.active, color: "text-blue-400" },
              { label: "Done", val: counts.done, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[#161B27] border border-[#1E2640] rounded-xl px-4 py-2 text-center">
                <div className={`text-xl font-bold leading-tight ${s.color}`}>{s.val}</div>
                <div className="text-[10px] text-[#6B7A9E] mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {/* Search */}
          <div className="relative flex-shrink-0 w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A9E]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Driver, carrier, load #..."
              className="w-full bg-[#161B27] border border-[#1E2640] rounded-xl pl-8 pr-3 py-2 text-sm text-[#E2E8F0] placeholder-[#6B7A9E] outline-none focus:border-[#8B5CF6]/60"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.key ? "bg-[#8B5CF6] text-white" : "bg-[#1E2640] text-[#6B7A9E] hover:text-[#E2E8F0]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[#111827]">
            <tr>
              {["Driver / Carrier", "Load #", "Truck #", "Trailer", "Phone", "Arrived", "Appointment", "Status", "Dock", "Wait", "Notes"].map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-[#6B7A9E] uppercase tracking-wider px-4 py-3 border-b border-[#1E2640] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const late = isLate(a.arrivalTime, a.appointmentTime, a.status);
              return (
                <tr key={a.id} className={`border-b border-[#1E2640]/50 hover:bg-[#161B27]/60 transition-colors ${i % 2 === 0 ? "" : "bg-[#161B27]/20"}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{a.driverName}</div>
                    <div className="text-xs text-[#6B7A9E] mt-0.5">{a.carrier}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#E2E8F0]">{a.loadNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#E2E8F0]">{a.truckNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#E2E8F0]">{a.trailerNumber}</td>
                  <td className="px-4 py-3 text-xs text-[#A8B3CF]">{a.driverPhone}</td>
                  <td className="px-4 py-3 text-xs text-[#A8B3CF]">{timeAgo(a.arrivalTime)}</td>
                  <td className={`px-4 py-3 text-xs font-medium ${late ? "text-red-400" : "text-[#A8B3CF]"}`}>
                    {fmtTime(a.appointmentTime)}{late ? " ⚠" : ""}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} size="sm" /></td>
                  <td className="px-4 py-3 text-xs font-bold text-blue-400">{a.assignedDock ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#A8B3CF]">{a.waitingMinutes}m</td>
                  <td className="px-4 py-3 text-xs text-[#6B7A9E] max-w-[200px] truncate">{a.notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-[#6B7A9E] text-sm">No arrivals found</div>
        )}
      </div>
    </div>
  );
}
