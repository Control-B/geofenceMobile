import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import type { Arrival, Dock } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function ConsoleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { arrivals, docks, approveCheckIn, rejectCheckIn, markLoadingStarted, markLoadingComplete, markDeparture } = useApp();

  const [dockPickerOpen, setDockPickerOpen] = useState(false);
  const [pendingArrivalId, setPendingArrivalId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const pending = useMemo(() =>
    arrivals.filter((a) => !a.checkedIn && (a.status === "arrived" || a.status === "en_route")),
    [arrivals]
  );
  const active = useMemo(() =>
    arrivals.filter((a) => a.checkedIn && a.status !== "completed" && a.status !== "departed"),
    [arrivals]
  );
  const availableDocks = useMemo(() => docks.filter((d) => d.status === "available"), [docks]);

  const openDockPicker = (arrivalId: string) => {
    if (availableDocks.length === 0) {
      Alert.alert("No Docks Available", "All docks are currently occupied or reserved.");
      return;
    }
    setPendingArrivalId(arrivalId);
    setDockPickerOpen(true);
  };

  const handleAssign = (dock: Dock) => {
    if (!pendingArrivalId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approveCheckIn(pendingArrivalId, dock.id);
    setDockPickerOpen(false);
    setPendingArrivalId(null);
  };

  const handleReject = (arrivalId: string, driverName: string) => {
    Alert.alert("Reject Check-In", `Reject ${driverName}'s check-in?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          rejectCheckIn(arrivalId);
        },
      },
    ]);
  };

  const handleLoadingAction = (arrival: Arrival) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (arrival.status === "dock_assigned" || arrival.status === "at_dock") {
      markLoadingStarted(arrival.id);
    } else if (arrival.status === "loading" || arrival.status === "unloading") {
      markLoadingComplete(arrival.id);
    } else if (arrival.status === "completed") {
      markDeparture(arrival.id);
    }
  };

  const getActionLabel = (status: string): string | null => {
    if (status === "dock_assigned" || status === "at_dock") return "Start Loading";
    if (status === "loading" || status === "unloading") return "Mark Complete";
    if (status === "completed") return "Mark Departed";
    return null;
  };

  const renderPending = ({ item }: { item: Arrival }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#F59E0B44" }]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.urgentBadge, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
            <Feather name="alert-circle" size={12} color="#F59E0B" />
            <Text style={styles.urgentText}>Awaiting Approval</Text>
          </View>
        </View>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeAgo(item.arrivalTime)}</Text>
      </View>

      <Text style={[styles.driverName, { color: colors.foreground }]}>{item.driverName}</Text>
      <Text style={[styles.carrierText, { color: colors.mutedForeground }]}>{item.carrier} · {item.trailerNumber} · {item.loadNumber}</Text>
      {item.notes ? <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{item.notes}</Text> : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => handleReject(item.id, item.driverName)}
          style={[styles.rejectBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)" }]}
        >
          <Feather name="x" size={16} color="#EF4444" />
          <Text style={[styles.rejectText]}>Reject</Text>
        </Pressable>
        <Pressable
          onPress={() => openDockPicker(item.id)}
          style={[styles.approveBtn, { backgroundColor: "#8B5CF6" }]}
        >
          <Feather name="anchor" size={16} color="#fff" />
          <Text style={styles.approveText}>Approve & Assign Dock</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderActive = ({ item }: { item: Arrival }) => {
    const actionLabel = getActionLabel(item.status);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <StatusBadge status={item.status} size="sm" />
          <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeAgo(item.arrivalTime)}</Text>
        </View>
        <Text style={[styles.driverName, { color: colors.foreground }]}>{item.driverName}</Text>
        <Text style={[styles.carrierText, { color: colors.mutedForeground }]}>{item.carrier} · {item.trailerNumber}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Load #</Text>
            <Text style={[styles.metaVal, { color: colors.foreground }]}>{item.loadNumber}</Text>
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

        {actionLabel && (
          <Pressable
            onPress={() => handleLoadingAction(item)}
            style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="check" size={16} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const sections = [
    ...(pending.length > 0 ? [{ type: "section_header", label: `Pending Approval (${pending.length})`, id: "h1" }] : []),
    ...pending.map((a) => ({ type: "pending", ...a })),
    { type: "section_header", label: `Active (${active.length})`, id: "h2" },
    ...active.map((a) => ({ type: "active", ...a })),
  ] as any[];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Check-In Console</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {pending.length} pending · {active.length} active
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id || item.type + item.id}
        renderItem={({ item }) => {
          if (item.type === "section_header") {
            return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{item.label}</Text>;
          }
          if (item.type === "pending") return renderPending({ item });
          if (item.type === "active") return renderActive({ item });
          return null;
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: botPad, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>All caught up</Text>
          </View>
        }
      />

      {/* Dock Picker Modal */}
      <Modal visible={dockPickerOpen} transparent animationType="slide" onRequestClose={() => setDockPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Available Dock</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{availableDocks.length} docks available</Text>
            <FlatList
              data={availableDocks}
              keyExtractor={(d) => d.id}
              numColumns={3}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleAssign(item)}
                  style={({ pressed }) => [styles.dockPill, { backgroundColor: pressed ? "#8B5CF6" : "rgba(139,92,246,0.12)", borderColor: "#8B5CF644" }]}
                >
                  <Text style={[styles.dockPillText, { color: "#8B5CF6" }]}>{item.name}</Text>
                </Pressable>
              )}
              columnWrapperStyle={{ gap: 8 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            />
            <Pressable onPress={() => setDockPickerOpen(false)} style={[styles.cancelBtn, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  headerSub: { fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flex: 1 },
  urgentBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  urgentText: { color: "#F59E0B", fontSize: 11, fontWeight: "600" as const },
  timeText: { fontSize: 12 },
  driverName: { fontSize: 15, fontWeight: "700" as const },
  carrierText: { fontSize: 13 },
  notesText: { fontSize: 12, fontStyle: "italic" as const },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  rejectText: { color: "#EF4444", fontSize: 14, fontWeight: "600" as const },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, borderRadius: 10 },
  approveText: { color: "#fff", fontSize: 14, fontWeight: "600" as const },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { gap: 1 },
  metaLabel: { fontSize: 10, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.3 },
  metaVal: { fontSize: 14, fontWeight: "600" as const },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 2 },
  actionBtnText: { fontSize: 14, fontWeight: "600" as const },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 8 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  modalSub: { fontSize: 13, marginBottom: 4 },
  dockPill: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  dockPillText: { fontSize: 14, fontWeight: "700" as const },
  cancelBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 16, fontWeight: "600" as const },
});
