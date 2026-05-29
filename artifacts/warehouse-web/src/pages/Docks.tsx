import { useMemo } from "react";
import { Wrench } from "lucide-react";
import { useWarehouse, type DockStatus } from "@/context/WarehouseContext";
import { dockDotColor } from "@/components/StatusBadge";

const STATUS_BG: Record<DockStatus, string> = {
  available:    "bg-emerald-500/10 border-emerald-500/30",
  reserved:     "bg-violet-500/10 border-violet-500/30",
  occupied:     "bg-blue-500/10 border-blue-500/30",
  delayed:      "bg-red-500/10 border-red-500/30",
  out_of_service: "bg-[#1E2640]/60 border-[#1E2640]",
};

const STATUS_LABEL: Record<DockStatus, string> = {
  available: "Available", reserved: "Reserved", occupied: "Occupied",
  delayed: "Delayed", out_of_service: "Out of Service",
};

export default function Docks() {
  const { docks } = useWarehouse();

  const stats = useMemo(() => ({
    available: docks.filter((d) => d.status === "available").length,
    occupied: docks.filter((d) => d.status === "occupied").length,
    reserved: docks.filter((d) => d.status === "reserved").length,
    delayed: docks.filter((d) => d.status === "delayed").length,
    oos: docks.filter((d) => d.status === "out_of_service").length,
  }), [docks]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E2640] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dock Board</h1>
            <p className="text-sm text-[#6B7A9E] mt-0.5">{docks.length} docks total</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Available", val: stats.available, color: "text-emerald-400" },
              { label: "Occupied", val: stats.occupied, color: "text-blue-400" },
              { label: "Reserved", val: stats.reserved, color: "text-violet-400" },
              { label: "Delayed", val: stats.delayed, color: "text-red-400" },
              { label: "OOS", val: stats.oos, color: "text-[#6B7A9E]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#161B27] border border-[#1E2640] rounded-xl px-4 py-2 text-center">
                <div className={`text-xl font-bold leading-tight ${s.color}`}>{s.val}</div>
                <div className="text-[10px] text-[#6B7A9E] mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dock Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
          {docks.map((dock) => {
            const dotColor = dockDotColor(dock.status);
            return (
              <div key={dock.id} className={`rounded-xl border p-3 ${STATUS_BG[dock.status]}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white">{dock.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                </div>
                <div className="text-[11px] font-semibold mb-2" style={{ color: dotColor }}>
                  {STATUS_LABEL[dock.status]}
                </div>
                {dock.status === "out_of_service" ? (
                  <div className="flex items-center gap-1 text-[10px] text-[#6B7A9E]">
                    <Wrench size={10} />
                    <span>Maintenance</span>
                  </div>
                ) : dock.assignedDriverName ? (
                  <>
                    <div className="text-[11px] text-[#E2E8F0] font-medium truncate">{dock.assignedDriverName}</div>
                    <div className="text-[10px] text-[#6B7A9E] truncate mt-0.5">{dock.assignedCarrier}</div>
                    <div className="text-[10px] font-mono text-[#A8B3CF] mt-0.5">{dock.assignedLoadNumber}</div>
                  </>
                ) : (
                  <div className="text-[10px] text-[#6B7A9E]">Unoccupied</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
