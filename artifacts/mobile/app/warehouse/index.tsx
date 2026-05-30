import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import type { Arrival, DriverStatus } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "pending" | "waiting" | "active" | "done";

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ap}`;
}

function isLate(arrival: Date, appointment: Date, status: DriverStatus): boolean {
  return arrival > appointment && status !== "completed" && status !== "departed";
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "waiting", label: "Waiting" },
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

function matchesFilter(a: Arrival, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "pending") return !a.checkedIn && (a.status === "arrived" || a.status === "en_route");
  if (f === "waiting") return a.status === "checked_in" || a.status === "waiting";
  if (f === "active") return ["dock_assigned", "at_dock", "loading", "unloading"].includes(a.status);
  if (f === "done") return a.status === "completed" || a.status === "departed";
  return true;
}

export default function QueueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { arrivals, clearRole } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return arrivals.filter((a) => {
      if (!matchesFilter(a, filter)) return false;
      if (!q) return true;
      return (
        a.driverName.toLowerCase().includes(q) ||
        a.carrier.toLowerCase().includes(q) ||
        a.loadNumber.toLowerCase().includes(q) ||
        a.trailerNumber.toLowerCase().includes(q) ||
        a.truckNumber.toLowerCase().includes(q) ||
        (a.driverPhone ?? "").toLowerCase().includes(q)
      );
    });
  }, [arrivals, search, filter]);

  const pendingCount = arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")).length;

  const renderItem = ({ item }: { item: Arrival }) => {
    const late = isLate(item.arrivalTime, item.appointmentTime, item.status);
    return (
      <View style={[styles.arrivalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={[styles.driverName, { color: colors.foreground }]}>{item.driverName}</Text>
            <Text style={[styles.carrier, { color: colors.mutedForeground }]}>{item.carrier}</Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Load #</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.loadNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Truck #</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.truckNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Trailer</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.trailerNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.driverPhone}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Arrived</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{timeAgo(item.arrivalTime)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Appt</Text>
            <Text style={[styles.metaVal, { color: late ? colors.destructive : colors.foreground }]}>
              {formatTime(item.appointmentTime)}{late ? " LATE" : ""}
            </Text>
          </View>
          {item.assignedDock && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Dock</Text>
              <Text style={[styles.metaVal, { color: colors.primary }]}>{item.assignedDock}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Wait</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.waitingMinutes}m</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={[styles.notes, { color: colors.mutedForeground, borderColor: colors.border }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Arrivals Queue</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{arrivals.length} drivers · {pendingCount} pending check-in</Text>
          </View>
          <Pressable
            onPress={async () => { await clearRole(); router.replace("/role-select"); }}
            style={[styles.switchBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Driver, carrier, load #..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                { backgroundColor: filter === f.key ? "#8B5CF6" : colors.secondary },
              ]}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: botPad, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="truck" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No arrivals found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  headerSub: { fontSize: 13, marginTop: 2 },
  switchBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontSize: 13, fontWeight: "500" as const },
  arrivalCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flex: 1, gap: 2 },
  driverName: { fontSize: 15, fontWeight: "600" as const },
  carrier: { fontSize: 13 },
  divider: { height: 1 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { minWidth: "30%", flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  metaVal: { fontSize: 13, fontWeight: "600" as const },
  notes: { fontSize: 12, borderTopWidth: 1, paddingTop: 8, marginTop: -2 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
