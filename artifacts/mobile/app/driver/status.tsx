import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import type { DriverStatus, StatusEvent } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ALL_STATUSES: DriverStatus[] = [
  "en_route", "arrived", "checked_in", "waiting",
  "dock_assigned", "at_dock", "loading", "unloading", "completed", "departed",
];

const STATUS_ICONS: Record<DriverStatus, string> = {
  en_route: "navigation",
  arrived: "map-pin",
  checked_in: "clipboard",
  waiting: "clock",
  dock_assigned: "anchor",
  at_dock: "truck",
  loading: "package",
  unloading: "package",
  completed: "check-circle",
  departed: "log-out",
};

const STATUS_DOT_COLORS: Record<DriverStatus, string> = {
  en_route: "#94A3B8",
  arrived: "#10B981",
  checked_in: "#3B82F6",
  waiting: "#F59E0B",
  dock_assigned: "#8B5CF6",
  at_dock: "#3B82F6",
  loading: "#F59E0B",
  unloading: "#F59E0B",
  completed: "#10B981",
  departed: "#94A3B8",
};

function formatDateTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ap}`;
}

export default function StatusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentLoad } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const currentIndex = ALL_STATUSES.indexOf(currentLoad.status);
  const historyMap = new Map<DriverStatus, StatusEvent>(
    currentLoad.statusHistory.map((e) => [e.status, e])
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Status</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: botPad, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Current Status</Text>
          <StatusBadge status={currentLoad.status} size="md" />
          <Text style={[styles.heroLoad, { color: colors.mutedForeground }]}>
            {currentLoad.loadNumber} · {currentLoad.carrier}
          </Text>
          {currentLoad.dockAssignment && (
            <View style={[styles.dockPill, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Feather name="anchor" size={14} color={colors.primary} />
              <Text style={[styles.dockPillText, { color: colors.primary }]}>Dock {currentLoad.dockAssignment}</Text>
            </View>
          )}
          {currentLoad.instructions && (
            <Text style={[styles.instructions, { color: colors.mutedForeground, borderColor: colors.border }]}>
              {currentLoad.instructions}
            </Text>
          )}
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Status Timeline</Text>
        <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {ALL_STATUSES.map((status, idx) => {
            const reached = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const event = historyMap.get(status);
            const dotColor = reached ? STATUS_DOT_COLORS[status] : colors.border;
            const isLast = idx === ALL_STATUSES.length - 1;

            return (
              <View key={status} style={styles.timelineRow}>
                {/* Left: line + dot */}
                <View style={styles.timelineDotCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: reached ? dotColor : "transparent", borderColor: dotColor, borderWidth: reached ? 0 : 2 },
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  />
                  {!isLast && <View style={[styles.timelineLine, { backgroundColor: idx < currentIndex ? dotColor : colors.border }]} />}
                </View>

                {/* Right: content */}
                <View style={[styles.timelineContent, !isLast && styles.timelineContentGap]}>
                  <View style={styles.timelineTop}>
                    <Text style={[styles.timelineStatus, { color: reached ? colors.foreground : colors.mutedForeground, fontWeight: isCurrent ? "700" : "400" as const }]}>
                      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                    {event && (
                      <Text style={[styles.timelineTime, { color: colors.mutedForeground }]}>
                        {formatDateTime(event.timestamp)}
                      </Text>
                    )}
                  </View>
                  {isCurrent && (
                    <Text style={[styles.timelineCurrent, { color: colors.primary }]}>Current</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 10 },
  heroLabel: { fontSize: 12, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  heroLoad: { fontSize: 13, marginTop: -4 },
  dockPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  dockPillText: { fontSize: 14, fontWeight: "600" as const },
  instructions: { fontSize: 14, lineHeight: 20, borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.6 },
  timelineCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  timelineRow: { flexDirection: "row", gap: 14 },
  timelineDotCol: { alignItems: "center", width: 16 },
  timelineDot: { width: 16, height: 16, borderRadius: 8 },
  timelineDotCurrent: { width: 18, height: 18, borderRadius: 9 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 4 },
  timelineContent: { flex: 1 },
  timelineContentGap: { paddingBottom: 20 },
  timelineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timelineStatus: { fontSize: 15 },
  timelineTime: { fontSize: 12 },
  timelineCurrent: { fontSize: 12, fontWeight: "600" as const, marginTop: 2 },
});
