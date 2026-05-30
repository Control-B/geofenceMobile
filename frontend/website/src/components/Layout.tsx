import { Link, useLocation } from "wouter";
import { Anchor, List, Grid2X2, Map, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWarehouse } from "@/context/WarehouseContext";

const NAV = [
  { href: "/", label: "Arrivals Queue", icon: List },
  { href: "/docks", label: "Dock Board", icon: Grid2X2 },
  { href: "/yard", label: "Yard Status", icon: Map },
  { href: "/console", label: "Check-In Console", icon: CheckCircle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { arrivals, pendingCount } = useWarehouse();

  const stats = {
    total: arrivals.filter((a) => a.status !== "departed" && a.status !== "en_route").length,
    active: arrivals.filter((a) => ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status)).length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117] text-[#E2E8F0]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#161B27] border-r border-[#1E2640]">
        {/* Logo */}
        <div className="p-4 border-b border-[#1E2640]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6] flex items-center justify-center flex-shrink-0">
              <Anchor size={15} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight text-white">DockFlow</div>
              <div className="text-[10px] text-[#6B7A9E] leading-tight">Warehouse Staff</div>
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="px-4 py-3 border-b border-[#1E2640] flex gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white leading-none">{stats.total}</div>
            <div className="text-[10px] text-[#6B7A9E] mt-0.5">On-Site</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400 leading-none">{pendingCount}</div>
            <div className="text-[10px] text-[#6B7A9E] mt-0.5">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400 leading-none">{stats.active}</div>
            <div className="text-[10px] text-[#6B7A9E] mt-0.5">Active</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            const hasBadge = href === "/console" && pendingCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
                  active
                    ? "bg-[#8B5CF6]/15 text-[#A78BFA]"
                    : "text-[#6B7A9E] hover:bg-[#1E2640] hover:text-[#E2E8F0]"
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {hasBadge && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E2640]">
          <div className="text-xs font-medium text-[#E2E8F0]">Midwest Fulfillment Hub</div>
          <div className="text-[11px] text-[#6B7A9E] mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
