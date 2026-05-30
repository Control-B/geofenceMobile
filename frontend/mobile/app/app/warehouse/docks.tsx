import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Dock, DockStatus } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_COLORS: Record<DockStatus, { bg: string; dot: string; label: string }> = {
  available: { bg: "rgba(16,185,129,0.12)", dot: "#10B981", label: "Available" },
  reserved: { bg: "rgba(139,92,246,0.12)", dot: "#8B5CF6", label: "Reserved" },
  occupied: { bg: "rgba(59,130,246,0.12)", dot: "#3B82F6", label: "Occupied" },
  delayed: { bg: "rgba(239,68,68,0.12)", dot: "#EF4444", label: "Delayed" },
  out_of_service: { bg: "rgba(100,116,139,0.08)", dot: "#94A3B8", label: "Out of Service" },
};

function DockCard({ dock, cardBg, cardBorder }: { dock: Dock; cardBg: string; cardBorder: string }) {
  const s = STATUS_COLORS[dock.status];
  return (
    <View style={[styles.dockCard, { backgroundColor: s.bg, borderColor: s.dot + "44" }]}>
      <View style={styles.dockCardTop}>
        <Text style={[styles.dockName, { color: dock.status === "out_of_service" ? "#94A3B8" : "#1E293B" }]}>
          {dock.name}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
      </View>
      <Text style={[styles.dockStatusLabel, { color: s.dot }]}>{s.label}</Text>
      {dock.assignedDriverName ? (
        <>
          <Text style={[styles.dockDriver, { color: "#334155" }]} numberOfLines={1}>{dock.assignedDriverName}</Text>
          <Text style={[styles.dockLoad, { color: "#64748B" }]}>{dock.assignedLoadNumber}</Text>
        </>
      ) : dock.status === "out_of_service" ? (
        <View style={styles.oosRow}>
          <Feather name="tool" size={12} color="#94A3B8" />
          <Text style={[styles.dockLoad, { color: "#94A3B8" }]}>Maintenance</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function DocksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { docks } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const stats = useMemo(() => ({
    available: docks.filter((d) => d.status === "available").length,
    occupied: docks.filter((d) => d.status === "occupied").length,
    reserved: docks.filter((d) => d.status === "reserved").length,
    delayed: docks.filter((d) => d.status === "delayed").length,
    oos: docks.filter((d) => d.status === "out_of_service").length,
    total: docks.length,
  }), [docks]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dock Board</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{stats.total} docks total</Text>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Available", val: stats.available, color: "#10B981" },
            { label: "Occupied", val: stats.occupied, color: "#3B82F6" },
            { label: "Reserved", val: stats.reserved, color: "#8B5CF6" },
            { label: "Delayed", val: stats.delayed, color: "#EF4444" },
            { label: "OOS", val: stats.oos, color: "#94A3B8" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={docks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.dockWrapper}>
            <DockCard dock={item} cardBg={colors.card} cardBorder={colors.border} />
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ gap: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  headerSub: { fontSize: 13 },
  statsRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 8 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontWeight: "700" as const },
  statLabel: { fontSize: 10, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.3 },
  dockWrapper: { flex: 1, marginBottom: 10 },
  dockCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 4, minHeight: 110 },
  dockCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dockName: { fontSize: 14, fontWeight: "700" as const },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dockStatusLabel: { fontSize: 11, fontWeight: "600" as const },
  dockDriver: { fontSize: 12, fontWeight: "500" as const, marginTop: 4 },
  dockLoad: { fontSize: 11 },
  oosRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
});
