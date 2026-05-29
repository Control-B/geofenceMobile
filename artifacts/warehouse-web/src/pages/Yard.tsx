import { useMemo } from "react";
import { useWarehouse, type Arrival } from "@/context/WarehouseContext";
import { StatusBadge } from "@/components/StatusBadge";

function timeAgo(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Section({ title, color, arrivals, count }: { title: string; color: string; arrivals: Arrival[]; count: number }) {
  return (
    <div className="bg-[#161B27] border border-[#1E2640] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E2640] flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-white text-sm">{title}</span>
        <span className="ml-auto text-xs font-bold rounded-full px-2.5 py-0.5" style={{ backgroundColor: color + "22", color }}>
          {count}
        </span>
      </div>
      {arrivals.length === 0 ? (
        <div className="px-4 py-6 text-center text-[#6B7A9E] text-sm">No vehicles in this area</div>
      ) : (
        <div className="divide-y divide-[#1E2640]/50">
          {arrivals.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{a.driverName}</div>
                <div className="text-xs text-[#6B7A9E] mt-0.5 truncate">{a.carrier} · {a.trailerNumber} · {a.loadNumber}</div>
              </div>
              <StatusBadge status={a.status} size="sm" />
              {a.assignedDock && <span className="text-xs font-bold text-blue-400 flex-shrink-0">Dock {a.assignedDock}</span>}
              <span className="text-xs text-[#6B7A9E] flex-shrink-0 w-16 text-right">{timeAgo(a.arrivalTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Yard() {
  const { arrivals, docks } = useWarehouse();

  const data = useMemo(() => {
    const waiting = arrivals.filter((a) => ["arrived", "checked_in", "waiting"].includes(a.status));
    const atDock = arrivals.filter((a) => ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status));
    const completed = arrivals.filter((a) => a.status === "completed" || a.status === "departed");
    const inbound = arrivals.filter((a) => a.status === "en_route");
    const onSite = waiting.length + atDock.length;
    const maxCap = 40;
    const pct = Math.min((onSite / maxCap) * 100, 100);
    const capColor = pct < 50 ? "#10B981" : pct < 80 ? "#F59E0B" : "#EF4444";
    const capLabel = pct < 50 ? "Low" : pct < 80 ? "Moderate" : "High";
    const avail = docks.filter((d) => d.status === "available").length;
    const active = docks.filter((d) => ["occupied", "reserved"].includes(d.status)).length;
    return { waiting, atDock, completed, inbound, onSite, maxCap, pct, capColor, capLabel, avail, active };
  }, [arrivals, docks]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E2640] flex-shrink-0">
        <h1 className="text-xl font-bold text-white">Yard Status</h1>
        <p className="text-sm text-[#6B7A9E] mt-0.5">{data.onSite} vehicles on-site · {data.inbound.length} inbound</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Capacity Card */}
        <div className="bg-[#161B27] border border-[#1E2640] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-white">Yard Capacity</span>
            <span className="text-sm font-bold" style={{ color: data.capColor }}>{data.capLabel}</span>
          </div>
          <div className="h-3 bg-[#1E2640] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.pct}%`, backgroundColor: data.capColor }} />
          </div>
          <div className="text-xs text-[#6B7A9E] mb-4">{data.onSite} / {data.maxCap} vehicles</div>

          <div className="grid grid-cols-4 gap-4 border-t border-[#1E2640] pt-4">
            {[
              { label: "On-Site", val: data.onSite, color: "text-white" },
              { label: "Available Docks", val: data.avail, color: "text-emerald-400" },
              { label: "Active Docks", val: data.active, color: "text-blue-400" },
              { label: "Inbound", val: data.inbound.length, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-[10px] text-[#6B7A9E] mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Section title="Waiting / Staging" color="#F59E0B" arrivals={data.waiting} count={data.waiting.length} />
          <Section title="At Dock / Loading" color="#3B82F6" arrivals={data.atDock} count={data.atDock.length} />
          <Section title="Completed Today" color="#10B981" arrivals={data.completed} count={data.completed.length} />
        </div>
      </div>
    </div>
  );
}
