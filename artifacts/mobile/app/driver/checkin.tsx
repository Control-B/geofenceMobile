import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentLoad, submitCheckIn } = useApp();

  const [truck, setTruck] = useState(currentLoad.truckNumber);
  const [trailer, setTrailer] = useState(currentLoad.trailerNumber);
  const [phone, setPhone] = useState(currentLoad.driverPhone);
  const [load, setLoad] = useState(currentLoad.loadNumber);
  const [reference, setReference] = useState(currentLoad.referenceNumber);
  const [po, setPo] = useState(currentLoad.poNumber);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(
    currentLoad.status === "waiting" ||
      currentLoad.status === "checked_in" ||
      currentLoad.status === "dock_assigned" ||
      currentLoad.status === "at_dock" ||
      currentLoad.status === "loading" ||
      currentLoad.status === "unloading" ||
      currentLoad.status === "completed" ||
      currentLoad.status === "departed"
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const canCheckIn = currentLoad.status === "arrived" || currentLoad.status === "en_route";

  const handleSubmit = () => {
    if (!trailer.trim() || !load.trim()) {
      Alert.alert("Required Fields", "Please enter Trailer Number and Load Number.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitCheckIn({ truckNumber: truck.trim(), trailerNumber: trailer.trim(), driverPhone: phone.trim(), loadNumber: load.trim(), referenceNumber: reference.trim(), poNumber: po.trim(), notes: notes.trim() });
    setSubmitted(true);
  };

  if (submitted || !canCheckIn) {
    const checkInDone =
      currentLoad.status !== "en_route" && currentLoad.status !== "arrived";
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Check In</Text>
        </View>
        <View style={styles.centered}>
          <View style={[styles.confirmIcon, { backgroundColor: checkInDone ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)" }]}>
            <Feather name={checkInDone ? "check-circle" : "clock"} size={48} color={checkInDone ? "#10B981" : colors.warning} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
            {checkInDone ? "Check-In Submitted" : "Not Yet Arrived"}
          </Text>
          <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
            {checkInDone
              ? `Your check-in for ${currentLoad.loadNumber} has been received. Waiting for dock assignment.`
              : "Check-in is available once you arrive at the facility. Use the Home tab to simulate your arrival."}
          </Text>
          {checkInDone && (
            <View style={[styles.confirmDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: "Load #", val: currentLoad.loadNumber },
                { label: "Truck #", val: currentLoad.truckNumber },
                { label: "Trailer", val: currentLoad.trailerNumber },
                { label: "Phone", val: currentLoad.driverPhone },
                { label: "Reference", val: currentLoad.referenceNumber },
              ].map((item) => (
                <View key={item.label} style={styles.confirmRow}>
                  <Text style={[styles.confirmLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.confirmVal, { color: colors.foreground }]}>{item.val}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Check In</Text>
        <Pressable style={[styles.scanBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="camera" size={16} color={colors.primary} />
          <Text style={[styles.scanText, { color: colors.primary }]}>Scan QR</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: botPad, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.prefilledBanner, { backgroundColor: "rgba(59,130,246,0.1)", borderColor: colors.primary }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.prefilledText, { color: colors.primary }]}>Fields pre-filled from your load. Edit if needed.</Text>
        </View>

        {([
          { label: "Truck Number", val: truck, set: setTruck, required: false, placeholder: "e.g. IL-2934" },
          { label: "Trailer Number", val: trailer, set: setTrailer, required: true, placeholder: "e.g. T-9234" },
          { label: "Driver Phone", val: phone, set: setPhone, required: false, placeholder: "e.g. (312) 555-0147" },
          { label: "Load Number", val: load, set: setLoad, required: true, placeholder: "e.g. LD-882341" },
          { label: "Reference Number", val: reference, set: setReference, required: false, placeholder: "e.g. REF-445521" },
          { label: "Purchase Order", val: po, set: setPo, required: false, placeholder: "e.g. PO-887234" },
        ] as const).map((field) => (
          <View key={field.label} style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              {field.label}
              {field.required && <Text style={{ color: colors.destructive }}> *</Text>}
            </Text>
            <TextInput
              value={field.val}
              onChangeText={field.set}
              placeholder={field.placeholder}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoCapitalize="characters"
            />
          </View>
        ))}

        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions or notes..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="check-circle" size={20} color={colors.primaryForeground} />
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Submit Check-In</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  scanText: { fontSize: 14, fontWeight: "600" as const },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  confirmIcon: { width: 96, height: 96, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 22, fontWeight: "700" as const, textAlign: "center" },
  confirmSub: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  confirmDetails: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between" },
  confirmLabel: { fontSize: 13 },
  confirmVal: { fontSize: 13, fontWeight: "600" as const },
  prefilledBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  prefilledText: { fontSize: 13, flex: 1 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "500" as const },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textArea: { height: 80, paddingTop: 12 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: 14, marginTop: 8 },
  submitText: { fontSize: 17, fontWeight: "700" as const },
});
