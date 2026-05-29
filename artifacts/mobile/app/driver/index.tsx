import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ap}`;
}

function isLate(appt: Date, status: string): boolean {
  return Date.now() > appt.getTime() && (status === "en_route" || status === "arrived");
}

export default function DriverHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentLoad, simulateArrival, clearRole } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const navigate = () => {
    const addr = encodeURIComponent(currentLoad.deliveryAddress);
    if (Platform.OS === "ios") {
      Linking.openURL(`maps:?daddr=${addr}`).catch(() =>
        Linking.openURL(`https://maps.google.com/?q=${addr}`)
      );
    } else if (Platform.OS === "android") {
      Linking.openURL(`geo:0,0?q=${addr}`);
    } else {
      Linking.openURL(`https://maps.google.com/?q=${addr}`);
    }
  };

  const handleSimulate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    simulateArrival();
  };

  const late = isLate(currentLoad.appointmentTime, currentLoad.status);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.facilityName, { color: colors.foreground }]} numberOfLines={1}>
            {currentLoad.deliveryFacility}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
        </View>
        <Pressable
          onPress={async () => { await clearRole(); router.replace("/role-select"); }}
          style={[styles.switchBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad, paddingHorizontal: 16, paddingTop: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status row */}
        <View style={styles.statusRow}>
          <StatusBadge status={currentLoad.status} />
          {currentLoad.queuePosition && currentLoad.status !== "dock_assigned" && currentLoad.status !== "at_dock" ? (
            <View style={[styles.queueChip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.queueText, { color: colors.secondaryForeground }]}>Queue #{currentLoad.queuePosition}</Text>
            </View>
          ) : null}
        </View>

        {/* Route Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>Pickup</Text>
              <Text style={[styles.routeFacility, { color: colors.foreground }]}>{currentLoad.pickupFacility}</Text>
            </View>
          </View>
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
            <View style={styles.routeInfo}>
              <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>Delivery</Text>
              <Text style={[styles.routeFacility, { color: colors.foreground }]}>{currentLoad.deliveryFacility}</Text>
              <Text style={[styles.routeAddress, { color: colors.mutedForeground }]}>{currentLoad.deliveryAddress}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={13} color={late ? colors.destructive : colors.mutedForeground} />
              <Text style={[styles.metaText, { color: late ? colors.destructive : colors.mutedForeground }]}>
                Appt {formatTime(currentLoad.appointmentTime)}{late ? " — LATE" : ""}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="navigation" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{currentLoad.eta} · {currentLoad.distance}</Text>
            </View>
          </View>
        </View>

        {/* Load Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailGrid}>
            {[
              { label: "Load #", val: currentLoad.loadNumber },
              { label: "Trailer", val: currentLoad.trailerNumber },
              { label: "Reference", val: currentLoad.referenceNumber },
              { label: "PO #", val: currentLoad.poNumber },
            ].map((item) => (
              <View key={item.label} style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.detailVal, { color: colors.foreground }]}>{item.val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Dock Assignment Card */}
        {(currentLoad.status === "dock_assigned" || currentLoad.status === "at_dock") && currentLoad.dockAssignment && (
          <View style={[styles.card, styles.dockCard, { backgroundColor: "rgba(59,130,246,0.1)", borderColor: colors.primary }]}>
            <View style={styles.dockHeader}>
              <Feather name="anchor" size={18} color={colors.primary} />
              <Text style={[styles.dockTitle, { color: colors.primary }]}>Dock Assignment</Text>
            </View>
            <Text style={[styles.dockNumber, { color: colors.foreground }]}>
              DOCK {currentLoad.dockAssignment}
            </Text>
            {currentLoad.instructions ? (
              <Text style={[styles.dockInstructions, { color: colors.mutedForeground }]}>
                {currentLoad.instructions}
              </Text>
            ) : null}
          </View>
        )}

        {/* Waiting card */}
        {(currentLoad.status === "waiting" || currentLoad.status === "checked_in") && (
          <View style={[styles.card, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: colors.warning }]}>
            <View style={styles.dockHeader}>
              <Feather name="clock" size={18} color={colors.warning} />
              <Text style={[styles.dockTitle, { color: colors.warning }]}>In Queue</Text>
            </View>
            <Text style={[styles.waitText, { color: colors.foreground }]}>Waiting for dock assignment</Text>
            <Text style={[styles.waitSub, { color: colors.mutedForeground }]}>You will receive a notification when your dock is ready</Text>
          </View>
        )}

        {/* Arrival / Arrived */}
        {currentLoad.status === "arrived" && (
          <View style={[styles.card, { backgroundColor: "rgba(16,185,129,0.1)", borderColor: colors.success }]}>
            <View style={styles.dockHeader}>
              <Feather name="map-pin" size={18} color={colors.success} />
              <Text style={[styles.dockTitle, { color: colors.success }]}>At Facility</Text>
            </View>
            <Text style={[styles.waitText, { color: colors.foreground }]}>You have arrived at {currentLoad.deliveryFacility}</Text>
            <Text style={[styles.waitSub, { color: colors.mutedForeground }]}>Proceed to the Check-In tab to complete your check-in</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 96 : insets.bottom + 57, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {currentLoad.status === "en_route" && (
          <Pressable
            onPress={handleSimulate}
            style={[styles.secondaryBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="map-pin" size={18} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Simulate Arrival</Text>
          </Pressable>
        )}
        <Pressable
          onPress={navigate}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="navigation" size={20} color={colors.primaryForeground} />
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Navigate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  facilityName: { fontSize: 18, fontWeight: "700" as const },
  headerSub: { fontSize: 13, marginTop: 2 },
  switchBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  queueChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  queueText: { fontSize: 12, fontWeight: "600" as const },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeLine: { width: 2, height: 24, marginLeft: 5, marginVertical: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 11, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  routeFacility: { fontSize: 16, fontWeight: "600" as const, marginTop: 1 },
  routeAddress: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: { minWidth: "45%", flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  detailVal: { fontSize: 14, fontWeight: "600" as const },
  dockCard: { borderWidth: 1.5 },
  dockHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dockTitle: { fontSize: 13, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  dockNumber: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5, marginBottom: 4 },
  dockInstructions: { fontSize: 14, lineHeight: 20 },
  waitText: { fontSize: 16, fontWeight: "600" as const, marginBottom: 4 },
  waitSub: { fontSize: 13, lineHeight: 18 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: 14 },
  primaryBtnText: { fontSize: 17, fontWeight: "700" as const },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" as const },
});
