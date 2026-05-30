import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Arrival } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function YardSection({ title, icon, count, color, arrivals, cardBg, cardBorder, muted, fg }: {
  title: string; icon: string; count: number; color: string; arrivals: Arrival[];
  cardBg: string; cardBorder: string; muted: string; fg: string;
}) {
  return (
    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + "22" }]}>
          <Feather name={icon as never} size={18} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: fg }]}>{title}</Text>
        <View style={[styles.countPill, { backgroundColor: color + "22" }]}>
          <Text style={[styles.countText, { color }]}>{count}</Text>
        </View>
      </View>
      {arrivals.map((a) => (
        <View key={a.id} style={[styles.yardRow, { borderColor: cardBorder }]}>
          <View style={[styles.yardDot, { backgroundColor: color }]} />
          <View style={styles.yardInfo}>
            <Text style={[styles.yardDriver, { color: fg }]}>{a.driverName}</Text>
            <Text style={[styles.yardSub, { color: muted }]}>{a.carrier} · Truck {a.truckNumber} · Trailer {a.trailerNumber} · {a.loadNumber}</Text>
          </View>
          <Text style={[styles.yardTime, { color: muted }]}>{timeAgo(a.arrivalTime)}</Text>
        </View>
      ))}
      {arrivals.length === 0 && (
        <Text style={[styles.emptySection, { color: muted }]}>No vehicles in this area</Text>
      )}
    </View>
  );
}

export default function YardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { arrivals, docks } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const yardData = useMemo(() => {
    const waiting = arrivals.filter((a) => a.status === "arrived" || a.status === "checked_in" || a.status === "waiting");
    const atDock = arrivals.filter((a) => ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status));
    const completed = arrivals.filter((a) => a.status === "completed" || a.status === "departed");
    const enRoute = arrivals.filter((a) => a.status === "en_route");

    const totalYard = waiting.length + atDock.length;
    const maxCapacity = 40;
    const capacityPct = Math.min((totalYard / maxCapacity) * 100, 100);
    const capacityLevel = capacityPct < 50 ? "Low" : capacityPct < 80 ? "Moderate" : "High";
    const capacityColor = capacityPct < 50 ? "#10B981" : capacityPct < 80 ? "#F59E0B" : "#EF4444";

    const availableDocks = docks.filter((d) => d.status === "available").length;
    const occupiedDocks = docks.filter((d) => d.status === "occupied" || d.status === "reserved").length;

    return { waiting, atDock, completed, enRoute, totalYard, maxCapacity, capacityPct, capacityLevel, capacityColor, availableDocks, occupiedDocks };
  }, [arrivals, docks]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Yard Status</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {yardData.totalYard} vehicles on-site · {yardData.enRoute.length} inbound
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: botPad, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Capacity Card */}
        <View style={[styles.capacityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.capHeader}>
            <Text style={[styles.capTitle, { color: colors.foreground }]}>Yard Capacity</Text>
            <Text style={[styles.capLevel, { color: yardData.capacityColor }]}>{yardData.capacityLevel}</Text>
          </View>
          <View style={[styles.capBar, { backgroundColor: colors.secondary }]}>
            <View style={[styles.capFill, { backgroundColor: yardData.capacityColor, width: `${yardData.capacityPct}%` as any }]} />
          </View>
          <Text style={[styles.capStats, { color: colors.mutedForeground }]}>
            {yardData.totalYard} / {yardData.maxCapacity} vehicles
          </Text>

          <View style={[styles.dockStats, { borderColor: colors.border }]}>
            <View style={styles.dockStatItem}>
              <Text style={[styles.dockStatVal, { color: "#10B981" }]}>{yardData.availableDocks}</Text>
              <Text style={[styles.dockStatLabel, { color: colors.mutedForeground }]}>Available Docks</Text>
            </View>
            <View style={[styles.dockStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.dockStatItem}>
              <Text style={[styles.dockStatVal, { color: "#3B82F6" }]}>{yardData.occupiedDocks}</Text>
              <Text style={[styles.dockStatLabel, { color: colors.mutedForeground }]}>Active Docks</Text>
            </View>
            <View style={[styles.dockStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.dockStatItem}>
              <Text style={[styles.dockStatVal, { color: "#F59E0B" }]}>{yardData.enRoute.length}</Text>
              <Text style={[styles.dockStatLabel, { color: colors.mutedForeground }]}>Inbound</Text>
            </View>
          </View>
        </View>

        <YardSection
          title="Waiting / Staging"
          icon="clock"
          count={yardData.waiting.length}
          color="#F59E0B"
          arrivals={yardData.waiting}
          cardBg={colors.card}
          cardBorder={colors.border}
          muted={colors.mutedForeground}
          fg={colors.foreground}
        />
        <YardSection
          title="At Dock / Loading"
          icon="anchor"
          count={yardData.atDock.length}
          color="#3B82F6"
          arrivals={yardData.atDock}
          cardBg={colors.card}
          cardBorder={colors.border}
          muted={colors.mutedForeground}
          fg={colors.foreground}
        />
        <YardSection
          title="Completed Today"
          icon="check-circle"
          count={yardData.completed.length}
          color="#10B981"
          arrivals={yardData.completed}
          cardBg={colors.card}
          cardBorder={colors.border}
          muted={colors.mutedForeground}
          fg={colors.foreground}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  headerSub: { fontSize: 13 },
  capacityCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  capHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  capTitle: { fontSize: 15, fontWeight: "600" as const },
  capLevel: { fontSize: 13, fontWeight: "700" as const },
  capBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  capFill: { height: "100%", borderRadius: 4 },
  capStats: { fontSize: 12 },
  dockStats: { flexDirection: "row", borderTopWidth: 1, paddingTop: 12, marginTop: 2 },
  dockStatItem: { flex: 1, alignItems: "center", gap: 2 },
  dockStatVal: { fontSize: 22, fontWeight: "700" as const },
  dockStatLabel: { fontSize: 10, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  dockStatDivider: { width: 1, marginHorizontal: 4 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "600" as const },
  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  countText: { fontSize: 13, fontWeight: "700" as const },
  yardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  yardDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  yardInfo: { flex: 1 },
  yardDriver: { fontSize: 13, fontWeight: "600" as const },
  yardSub: { fontSize: 11, marginTop: 1 },
  yardTime: { fontSize: 11, flexShrink: 0 },
  emptySection: { fontSize: 13, textAlign: "center", paddingVertical: 12 },
});
