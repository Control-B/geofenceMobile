import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DockStatus, DriverStatus } from "@/context/AppContext";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  en_route: { bg: "rgba(100,116,139,0.15)", fg: "#94A3B8" },
  arrived: { bg: "rgba(16,185,129,0.18)", fg: "#10B981" },
  checked_in: { bg: "rgba(59,130,246,0.18)", fg: "#3B82F6" },
  waiting: { bg: "rgba(245,158,11,0.18)", fg: "#F59E0B" },
  dock_assigned: { bg: "rgba(139,92,246,0.18)", fg: "#8B5CF6" },
  at_dock: { bg: "rgba(59,130,246,0.18)", fg: "#3B82F6" },
  loading: { bg: "rgba(245,158,11,0.18)", fg: "#F59E0B" },
  unloading: { bg: "rgba(245,158,11,0.18)", fg: "#F59E0B" },
  completed: { bg: "rgba(16,185,129,0.18)", fg: "#10B981" },
  departed: { bg: "rgba(100,116,139,0.15)", fg: "#94A3B8" },
  available: { bg: "rgba(16,185,129,0.18)", fg: "#10B981" },
  reserved: { bg: "rgba(139,92,246,0.18)", fg: "#8B5CF6" },
  occupied: { bg: "rgba(59,130,246,0.18)", fg: "#3B82F6" },
  delayed: { bg: "rgba(239,68,68,0.18)", fg: "#EF4444" },
  out_of_service: { bg: "rgba(100,116,139,0.15)", fg: "#94A3B8" },
};

const STATUS_LABELS: Record<string, string> = {
  en_route: "En Route",
  arrived: "Arrived",
  checked_in: "Checked In",
  waiting: "Waiting",
  dock_assigned: "Dock Assigned",
  at_dock: "At Dock",
  loading: "Loading",
  unloading: "Unloading",
  completed: "Completed",
  departed: "Departed",
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  delayed: "Delayed",
  out_of_service: "Out of Service",
};

interface StatusBadgeProps {
  status: DriverStatus | DockStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? { bg: "rgba(100,116,139,0.15)", fg: "#94A3B8" };
  const label = STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: color.bg }, size === "sm" && styles.badgeSm]}>
      <Text style={[styles.text, { color: color.fg }, size === "sm" && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status]?.fg ?? "#94A3B8";
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.2 },
  textSm: { fontSize: 10 },
});
