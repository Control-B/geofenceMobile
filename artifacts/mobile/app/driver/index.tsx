import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import type { CreateLoadData, Load } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isLate(appt: Date, status: string): boolean {
  return Date.now() > appt.getTime() && (status === "en_route" || status === "arrived");
}

function todayDateStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${d.getFullYear()}`;
}

function defaultTimeStr(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return formatTime(d);
}

function parseApptTime(date: string, time: string): Date {
  try {
    const parts = date.split("/").map(Number);
    const m = parts[0], day = parts[1], y = parts[2];
    const match = time.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return new Date();
    let h = parseInt(match[1]);
    const min = parseInt(match[2]);
    const pm = match[3].toLowerCase() === "pm";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    const dt = new Date();
    if (y) dt.setFullYear(y, m - 1, day);
    else dt.setMonth(m - 1, day);
    dt.setHours(h, min, 0, 0);
    return dt;
  } catch {
    return new Date();
  }
}

const STATUS_COLORS: Record<string, string> = {
  en_route: "#3B82F6", arrived: "#10B981", checked_in: "#F59E0B",
  waiting: "#F59E0B", dock_assigned: "#8B5CF6", at_dock: "#8B5CF6",
  loading: "#F97316", unloading: "#F97316", completed: "#10B981", departed: "#6B7A9E",
};
const STATUS_LABELS: Record<string, string> = {
  en_route: "En Route", arrived: "Arrived", checked_in: "Checked In",
  waiting: "In Queue", dock_assigned: "Dock Assigned", at_dock: "At Dock",
  loading: "Loading", unloading: "Unloading", completed: "Completed", departed: "Departed",
};

// ─────────────────────────────────────────────
// Create Trip Sheet
// ─────────────────────────────────────────────

function CreateTripSheet({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreateLoadData) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [deliveryFacility, setDeliveryFacility] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupFacility, setPickupFacility] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [apptDate, setApptDate] = useState(todayDateStr());
  const [apptTime, setApptTime] = useState(defaultTimeStr());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setDeliveryFacility(""); setDeliveryAddress(""); setPickupFacility("");
    setPickupAddress(""); setLoadNumber(""); setCarrier(""); setTrailerNumber("");
    setReferenceNumber(""); setPoNumber(""); setApptDate(todayDateStr());
    setApptTime(defaultTimeStr()); setErrors({});
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!deliveryFacility.trim()) e.deliveryFacility = "Required";
    if (!deliveryAddress.trim()) e.deliveryAddress = "Required";
    if (!loadNumber.trim()) e.loadNumber = "Required";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      deliveryFacility: deliveryFacility.trim(),
      deliveryAddress: deliveryAddress.trim(),
      pickupFacility: pickupFacility.trim(),
      pickupAddress: pickupAddress.trim(),
      loadNumber: loadNumber.trim(),
      carrier: carrier.trim(),
      trailerNumber: trailerNumber.trim(),
      referenceNumber: referenceNumber.trim(),
      poNumber: poNumber.trim(),
      appointmentTime: parseApptTime(apptDate, apptTime),
    });
    reset();
  };

  const Field = ({ label, value, onChange, placeholder, error, keyboardType = "default", required = false }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string; keyboardType?: any; required?: boolean;
  }) => (
    <View style={{ gap: 5 }}>
      <Text style={[ctStyles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={(v) => { onChange(v); if (errors[label.toLowerCase().replace(/\s/g, "")]) setErrors((e) => ({ ...e, [label.toLowerCase().replace(/\s/g, "")]: "" })); }}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[ctStyles.input, { backgroundColor: colors.card, borderColor: error ? "#EF4444" : colors.border, color: colors.foreground }]}
        returnKeyType="next"
      />
      {error ? <Text style={ctStyles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[ctStyles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Header */}
          <View style={[ctStyles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={handleClose} hitSlop={12} style={[ctStyles.headerBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[ctStyles.headerTitle, { color: colors.foreground }]}>New Trip</Text>
            <Pressable onPress={handleSave} hitSlop={12} style={[ctStyles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={[ctStyles.saveBtnText, { color: colors.primaryForeground }]}>Create</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Delivery */}
            <View style={{ gap: 12 }}>
              <Text style={[ctStyles.section, { color: colors.mutedForeground }]}>Delivery (Required)</Text>
              <Field label="deliveryFacility" value={deliveryFacility} onChange={setDeliveryFacility}
                placeholder="e.g. Midwest Fulfillment Hub" error={errors.deliveryFacility} required />
              <Field label="deliveryAddress" value={deliveryAddress} onChange={setDeliveryAddress}
                placeholder="e.g. 8800 Regal Row, Dallas, TX" error={errors.deliveryAddress} required />
            </View>

            {/* Pickup */}
            <View style={{ gap: 12 }}>
              <Text style={[ctStyles.section, { color: colors.mutedForeground }]}>Pickup (Optional)</Text>
              <Field label="pickupFacility" value={pickupFacility} onChange={setPickupFacility}
                placeholder="e.g. Chicago Distribution Center" />
              <Field label="pickupAddress" value={pickupAddress} onChange={setPickupAddress}
                placeholder="e.g. 1400 W Lake St, Chicago, IL" />
            </View>

            {/* Load Info */}
            <View style={{ gap: 12 }}>
              <Text style={[ctStyles.section, { color: colors.mutedForeground }]}>Load Info</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="loadNumber" value={loadNumber} onChange={setLoadNumber}
                    placeholder="LD-123456" error={errors.loadNumber} required />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="trailerNumber" value={trailerNumber} onChange={setTrailerNumber}
                    placeholder="T-0000" />
                </View>
              </View>
              <Field label="carrier" value={carrier} onChange={setCarrier} placeholder="e.g. Alliance Transport" />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="referenceNumber" value={referenceNumber} onChange={setReferenceNumber}
                    placeholder="REF-000000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="poNumber" value={poNumber} onChange={setPoNumber} placeholder="PO-000000" />
                </View>
              </View>
            </View>

            {/* Appointment */}
            <View style={{ gap: 12 }}>
              <Text style={[ctStyles.section, { color: colors.mutedForeground }]}>Appointment</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="date" value={apptDate} onChange={setApptDate} placeholder="MM/DD/YYYY" keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="time" value={apptTime} onChange={setApptTime} placeholder="10:30 AM" />
                </View>
              </View>
              <Text style={[ctStyles.hint, { color: colors.mutedForeground }]}>
                Format: MM/DD/YYYY and HH:MM AM/PM
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const ctStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" as const },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveBtnText: { fontSize: 14, fontWeight: "700" as const },
  section: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldLabel: { fontSize: 12, fontWeight: "500" as const, textTransform: "capitalize" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  errorText: { fontSize: 11, color: "#EF4444" },
  hint: { fontSize: 12, lineHeight: 17 },
});

// ─────────────────────────────────────────────
// Trip card (inactive trips in the list)
// ─────────────────────────────────────────────

function OtherTripCard({ load, onSetActive }: { load: Load; onSetActive: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[load.status] ?? "#6B7A9E";

  return (
    <View style={[tripStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tripStyles.facility, { color: colors.foreground }]} numberOfLines={1}>
          {load.deliveryFacility}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
          <View style={[tripStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[tripStyles.meta, { color: colors.mutedForeground }]}>
            {STATUS_LABELS[load.status]} · {load.loadNumber} · {formatShortDate(load.appointmentTime)} {formatTime(load.appointmentTime)}
          </Text>
        </View>
        {load.trailerNumber && load.trailerNumber !== "—" && (
          <Text style={[tripStyles.trailer, { color: colors.mutedForeground }]}>Trailer {load.trailerNumber}</Text>
        )}
      </View>
      <Pressable
        onPress={onSetActive}
        style={({ pressed }) => [tripStyles.activateBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name="zap" size={12} color={colors.primary} />
        <Text style={[tripStyles.activateBtnText, { color: colors.primary }]}>Switch</Text>
      </Pressable>
    </View>
  );
}

const tripStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  facility: { fontSize: 14, fontWeight: "600" as const },
  statusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  meta: { fontSize: 12, flex: 1 },
  trailer: { fontSize: 11, marginTop: 2 },
  activateBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, flexShrink: 0 },
  activateBtnText: { fontSize: 12, fontWeight: "700" as const },
});

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function DriverHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentLoad, loads, activeLoadId, simulateArrival, clearRole, createLoad, setActiveLoad } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [createVisible, setCreateVisible] = useState(false);

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

  const otherLoads = loads.filter((l) => l.id !== activeLoadId);
  const late = isLate(currentLoad.appointmentTime, currentLoad.status);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.facilityName, { color: colors.foreground }]} numberOfLines={1}>
            {currentLoad.deliveryFacility}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {/* Trip count chip */}
          {loads.length > 1 && (
            <View style={[styles.tripCountChip, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="map" size={12} color={colors.primary} />
              <Text style={[styles.tripCountText, { color: colors.primary }]}>{loads.length} trips</Text>
            </View>
          )}
          <Pressable
            onPress={() => setCreateVisible(true)}
            hitSlop={8}
            style={[styles.newTripBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={15} color={colors.primaryForeground} />
            <Text style={[styles.newTripBtnText, { color: colors.primaryForeground }]}>New Trip</Text>
          </Pressable>
          <Pressable
            onPress={async () => { await clearRole(); router.replace("/role-select"); }}
            style={[styles.switchBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 124 : insets.bottom + 82, paddingHorizontal: 16, paddingTop: 16, gap: 12 }}
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
            <Text style={[styles.dockNumber, { color: colors.foreground }]}>DOCK {currentLoad.dockAssignment}</Text>
            {currentLoad.instructions ? (
              <Text style={[styles.dockInstructions, { color: colors.mutedForeground }]}>{currentLoad.instructions}</Text>
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

        {/* ── Other Trips ── */}
        {otherLoads.length > 0 && (
          <View style={{ gap: 10, marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Other Trips</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{otherLoads.length} load{otherLoads.length !== 1 ? "s" : ""}</Text>
            </View>
            {otherLoads.map((load) => (
              <OtherTripCard
                key={load.id}
                load={load}
                onSetActive={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setActiveLoad(load.id);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 124 : insets.bottom + 82, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {currentLoad.status === "en_route" && (
          <Pressable
            onPress={handleSimulate}
            style={[styles.secondaryBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="map-pin" size={18} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Simulate Arrival</Text>
          </Pressable>
        )}
        <Pressable onPress={navigate} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
          <Feather name="navigation" size={20} color={colors.primaryForeground} />
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Navigate</Text>
        </Pressable>
      </View>

      <CreateTripSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSave={(data) => {
          createLoad(data);
          setCreateVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  facilityName: { fontSize: 17, fontWeight: "700" as const },
  headerSub: { fontSize: 12, marginTop: 2 },
  switchBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tripCountChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  tripCountText: { fontSize: 12, fontWeight: "600" as const },
  newTripBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  newTripBtnText: { fontSize: 13, fontWeight: "600" as const },
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
  sectionTitle: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionCount: { fontSize: 11 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: 14 },
  primaryBtnText: { fontSize: 17, fontWeight: "700" as const },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" as const },
});
