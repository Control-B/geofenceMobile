const COLORS: Record<string, { bg: string; text: string }> = {
  en_route:     { bg: "rgba(100,116,139,0.15)", text: "#94A3B8" },
  arrived:      { bg: "rgba(16,185,129,0.18)",  text: "#34D399" },
  checked_in:   { bg: "rgba(59,130,246,0.18)",  text: "#60A5FA" },
  waiting:      { bg: "rgba(245,158,11,0.18)",  text: "#FBBF24" },
  dock_assigned:{ bg: "rgba(139,92,246,0.18)",  text: "#A78BFA" },
  at_dock:      { bg: "rgba(59,130,246,0.18)",  text: "#60A5FA" },
  loading:      { bg: "rgba(245,158,11,0.18)",  text: "#FBBF24" },
  unloading:    { bg: "rgba(245,158,11,0.18)",  text: "#FBBF24" },
  completed:    { bg: "rgba(16,185,129,0.18)",  text: "#34D399" },
  departed:     { bg: "rgba(100,116,139,0.15)", text: "#94A3B8" },
  available:    { bg: "rgba(16,185,129,0.18)",  text: "#34D399" },
  reserved:     { bg: "rgba(139,92,246,0.18)",  text: "#A78BFA" },
  occupied:     { bg: "rgba(59,130,246,0.18)",  text: "#60A5FA" },
  delayed:      { bg: "rgba(239,68,68,0.18)",   text: "#F87171" },
  out_of_service:{ bg:"rgba(100,116,139,0.12)", text: "#94A3B8" },
};

const LABELS: Record<string, string> = {
  en_route: "En Route", arrived: "Arrived", checked_in: "Checked In",
  waiting: "Waiting", dock_assigned: "Dock Assigned", at_dock: "At Dock",
  loading: "Loading", unloading: "Unloading", completed: "Completed",
  departed: "Departed", available: "Available", reserved: "Reserved",
  occupied: "Occupied", delayed: "Delayed", out_of_service: "Out of Service",
};

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const c = COLORS[status] ?? { bg: "rgba(100,116,139,0.15)", text: "#94A3B8" };
  const label = LABELS[status] ?? status;
  const cls = size === "sm" ? "text-[10px] px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5 font-semibold" : "text-xs px-2.5 py-1";
  return (
    <span className={`inline-block font-semibold rounded-full whitespace-nowrap ${cls}`} style={{ backgroundColor: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

export function dockDotColor(status: string): string {
  return COLORS[status]?.text ?? "#94A3B8";
}
