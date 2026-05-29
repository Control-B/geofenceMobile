import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SignatureModal } from "@/components/SignatureModal";
import type { DocType, DocumentSignature, LoadDocument, SigFieldType } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtTime(d: Date) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const DOC_COLORS: Record<DocType, string> = {
  BOL: "#3B82F6", POD: "#10B981", rate_confirmation: "#F59E0B",
  appointment_confirmation: "#8B5CF6", lumper_receipt: "#F97316", custom: "#6B7A9E",
};
const DOC_ICONS: Record<DocType, string> = {
  BOL: "file-text", POD: "check-circle", rate_confirmation: "dollar-sign",
  appointment_confirmation: "calendar", lumper_receipt: "tool", custom: "paperclip",
};
const DOC_LABELS: Record<DocType, string> = {
  BOL: "BOL", POD: "POD", rate_confirmation: "Rate Conf",
  appointment_confirmation: "Appt Conf", lumper_receipt: "Lumper", custom: "Custom",
};
const STATUS_COLORS: Record<string, string> = {
  uploaded: "#6B7A9E", needs_driver_sig: "#F59E0B", needs_clerk_sig: "#3B82F6",
  fully_signed: "#10B981", rejected: "#EF4444", completed: "#10B981",
};
const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded", needs_driver_sig: "Sign Required", needs_clerk_sig: "Awaiting Clerk",
  fully_signed: "Fully Signed", rejected: "Rejected", completed: "Completed",
};

const UPLOAD_OPTIONS: { type: DocType; label: string }[] = [
  { type: "BOL", label: "Bill of Lading (BOL)" },
  { type: "POD", label: "Proof of Delivery (POD)" },
  { type: "rate_confirmation", label: "Rate Confirmation" },
  { type: "lumper_receipt", label: "Lumper Receipt" },
  { type: "custom", label: "Custom Document" },
];

// ─────────────────────────────────────────────
// Modal top-padding helper
// On iOS page sheets, insets.top is 0 but we still
// need padding for the drag indicator + breathing room.
// On iOS we add a fixed 20px. On Android/web we use
// the real insets.
// ─────────────────────────────────────────────
function useModalTopPad() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "ios") return insets.top > 0 ? insets.top + 8 : 20;
  return insets.top + 8;
}

// ─────────────────────────────────────────────
// Signing Timeline
// ─────────────────────────────────────────────

type TimelineStep = { key: string; label: string };

const STEPS: TimelineStep[] = [
  { key: "arrived",      label: "Arrived" },
  { key: "checked_in",   label: "Checked In" },
  { key: "docs_ready",   label: "Docs Ready" },
  { key: "driver_signed",label: "Driver Signed" },
  { key: "clerk_signed", label: "Clerk Signed" },
  { key: "completed",    label: "Complete" },
];

const STEP_ICONS: Record<string, string> = {
  arrived: "map-pin", checked_in: "clipboard", docs_ready: "upload-cloud",
  driver_signed: "pen-tool", clerk_signed: "check-square", completed: "check-circle",
};

function SigningTimeline({ docs, loadStatus }: { docs: LoadDocument[]; loadStatus: string }) {
  const colors = useColors();
  const ARRIVED_STATUSES = ["arrived","checked_in","waiting","dock_assigned","at_dock","loading","unloading","completed","departed"];
  const CHECKEDIN_STATUSES = ["waiting","dock_assigned","at_dock","loading","unloading","completed","departed"];

  const driverSignedAll = docs.filter((d) => d.requiresDriverSig).every((d) =>
    d.signatures.some((s) => s.role === "Driver")
  );
  const clerkSignedAll = docs.filter((d) => d.requiresClerkSig).every((d) =>
    d.status === "fully_signed" || d.status === "completed"
  );

  const stepDone: Record<string, boolean> = {
    arrived:       ARRIVED_STATUSES.includes(loadStatus),
    checked_in:    CHECKEDIN_STATUSES.includes(loadStatus),
    docs_ready:    docs.length > 0,
    driver_signed: driverSignedAll && docs.filter((d) => d.requiresDriverSig).length > 0,
    clerk_signed:  clerkSignedAll  && docs.filter((d) => d.requiresClerkSig).length > 0,
    completed:     loadStatus === "completed" || loadStatus === "departed",
  };

  const currentIdx = STEPS.reduce((acc, s, i) => (stepDone[s.key] ? i : acc), -1);

  return (
    <View style={[tStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[tStyles.cardTitle, { color: colors.mutedForeground }]}>Signing Progress</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tStyles.steps}>
        {STEPS.map((step, idx) => {
          const done = stepDone[step.key];
          const isCurrent = idx === currentIdx + 1;
          const dotColor = done ? "#10B981" : isCurrent ? "#F59E0B" : colors.border;
          const isLast = idx === STEPS.length - 1;
          return (
            <View key={step.key} style={tStyles.stepWrap}>
              {/* connector line before (except first) */}
              {idx > 0 && (
                <View style={[tStyles.connLine, { backgroundColor: stepDone[STEPS[idx - 1].key] ? "#10B981" : colors.border }]} />
              )}
              <View style={tStyles.step}>
                <View style={[tStyles.dot, {
                  backgroundColor: done ? dotColor : isCurrent ? "transparent" : "transparent",
                  borderColor: dotColor,
                  borderWidth: done ? 0 : 2,
                }]}>
                  {done ? (
                    <Feather name="check" size={10} color="#fff" />
                  ) : isCurrent ? (
                    <View style={[tStyles.pulseDot, { backgroundColor: "#F59E0B" }]} />
                  ) : null}
                </View>
                <Text style={[tStyles.stepLabel, {
                  color: done ? colors.foreground : isCurrent ? "#F59E0B" : colors.mutedForeground,
                  fontWeight: (done || isCurrent) ? "600" : "400" as const,
                }]} numberOfLines={2}>
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const tStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  steps: { flexDirection: "row", alignItems: "flex-start" },
  stepWrap: { flexDirection: "row", alignItems: "center" },
  connLine: { width: 24, height: 2, marginBottom: 18 },
  step: { alignItems: "center", width: 52, gap: 5 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontSize: 10, textAlign: "center", lineHeight: 13 },
});

// ─────────────────────────────────────────────
// Document Detail Modal
// ─────────────────────────────────────────────

function DocumentDetailModal({ doc, visible, onClose, onSign }: {
  doc: LoadDocument | null;
  visible: boolean;
  onClose: () => void;
  onSign: (fieldType: SigFieldType) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!doc) return null;

  const docColor = DOC_COLORS[doc.type];
  const statusColor = STATUS_COLORS[doc.status];
  const driverSigned = doc.signatures.some((s) => s.role === "Driver");

  const SIG_FIELDS: { type: SigFieldType; label: string }[] = [
    { type: "signature", label: "Driver Signature" },
    { type: "initials",  label: "Driver Initials" },
    { type: "name",      label: "Printed Name" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[dStyles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        {/* Header */}
        <View style={[dStyles.header, { borderBottomColor: colors.border }]}>
          <View style={[dStyles.docIcon, { backgroundColor: docColor + "20" }]}>
            <Feather name={DOC_ICONS[doc.type] as any} size={18} color={docColor} />
          </View>
          <View style={dStyles.headerTitle}>
            <Text style={[dStyles.docName, { color: colors.foreground }]} numberOfLines={1}>{doc.name}</Text>
            <Text style={[dStyles.docMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
              Uploaded {fmtDate(doc.uploadedAt)} · {doc.uploadedBy}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[dStyles.closeBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status */}
          <View style={[dStyles.statusRow, { backgroundColor: statusColor + "15", borderColor: statusColor + "40" }]}>
            <View style={[dStyles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[dStyles.statusLabel, { color: statusColor }]}>{STATUS_LABELS[doc.status]}</Text>
          </View>

          {/* Notes */}
          {doc.notes ? (
            <View style={[dStyles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.primary} />
              <Text style={[dStyles.notesText, { color: colors.foreground }]}>{doc.notes}</Text>
            </View>
          ) : null}

          {/* Signature Fields — only if driver hasn't signed yet */}
          {doc.requiresDriverSig && !driverSigned && (
            <View style={{ gap: 8 }}>
              <Text style={[dStyles.sectionTitle, { color: colors.mutedForeground }]}>Signature Required</Text>
              {SIG_FIELDS.map((f) => (
                <Pressable
                  key={f.type}
                  onPress={() => onSign(f.type)}
                  hitSlop={4}
                  style={({ pressed }) => [
                    dStyles.sigField,
                    { backgroundColor: colors.card, borderColor: "#F59E0B80", opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View style={[dStyles.sigFieldIcon, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="edit-3" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[dStyles.sigFieldLabel, { color: colors.foreground }]}>{f.label}</Text>
                    <Text style={[dStyles.sigFieldSub, { color: colors.mutedForeground }]}>Tap to sign here</Text>
                  </View>
                  <View style={[dStyles.signArrow, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="chevron-right" size={16} color="#F59E0B" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Collected Signatures */}
          {doc.signatures.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[dStyles.sectionTitle, { color: colors.mutedForeground }]}>Collected Signatures</Text>
              {doc.signatures.map((sig) => (
                <View key={sig.id} style={[dStyles.sigRecord, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[dStyles.sigRecordBadge, { backgroundColor: sig.role === "Driver" ? "#3B82F620" : "#8B5CF620" }]}>
                    <Feather name={sig.role === "Driver" ? "truck" : "user"} size={14} color={sig.role === "Driver" ? "#3B82F6" : "#8B5CF6"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[dStyles.sigRecordName, { color: colors.foreground }]}>{sig.signer}</Text>
                    <Text style={[dStyles.sigRecordMeta, { color: colors.mutedForeground }]}>
                      {sig.role} · {sig.signatureType === "typed" ? "Typed" : "Drawn"} · {fmtDate(sig.timestamp)} {fmtTime(sig.timestamp)}
                    </Text>
                  </View>
                  <Feather name="check-circle" size={16} color="#10B981" />
                </View>
              ))}
            </View>
          )}

          {/* Awaiting clerk */}
          {doc.status === "needs_clerk_sig" && (
            <View style={[dStyles.clerkWait, { backgroundColor: "#3B82F615", borderColor: "#3B82F640" }]}>
              <Feather name="clock" size={16} color="#3B82F6" />
              <Text style={[dStyles.clerkWaitText, { color: "#3B82F6" }]}>
                Waiting for warehouse clerk countersignature
              </Text>
            </View>
          )}

          {/* Audit Trail */}
          {doc.auditTrail.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[dStyles.sectionTitle, { color: colors.mutedForeground }]}>Audit Trail</Text>
              <View style={[dStyles.auditCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {doc.auditTrail.map((entry, i) => (
                  <View
                    key={entry.id}
                    style={[
                      dStyles.auditRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
                    ]}
                  >
                    <View style={[dStyles.auditDotEl, { backgroundColor: colors.mutedForeground }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[dStyles.auditAction, { color: colors.foreground }]}>{entry.action}</Text>
                      <Text style={[dStyles.auditMeta, { color: colors.mutedForeground }]}>
                        {entry.signer} · {entry.role} · {fmtDate(entry.timestamp)} {fmtTime(entry.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const dStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitle: { flex: 1, minWidth: 0 },
  docName: { fontSize: 15, fontWeight: "700" as const },
  docMeta: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: "600" as const },
  notesBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  notesText: { fontSize: 13, flex: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  sigField: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 2, minHeight: 64 },
  sigFieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sigFieldLabel: { fontSize: 15, fontWeight: "700" as const },
  sigFieldSub: { fontSize: 13, marginTop: 2 },
  signArrow: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sigRecord: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  sigRecordBadge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sigRecordName: { fontSize: 14, fontWeight: "600" as const },
  sigRecordMeta: { fontSize: 11, marginTop: 2 },
  clerkWait: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  clerkWaitText: { fontSize: 13, fontWeight: "500" as const, flex: 1 },
  auditCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  auditRow: { flexDirection: "row", gap: 10 },
  auditDotEl: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0, opacity: 0.5 },
  auditAction: { fontSize: 13, fontWeight: "500" as const },
  auditMeta: { fontSize: 11, marginTop: 2 },
});

// ─────────────────────────────────────────────
// Upload Sheet
// ─────────────────────────────────────────────

function UploadSheet({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: DocType) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[uStyles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <View style={[uStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[uStyles.title, { color: colors.foreground }]}>Add Document</Text>
          <Pressable onPress={onClose} hitSlop={12} style={[uStyles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
          <Text style={[uStyles.sub, { color: colors.mutedForeground }]}>Select the document type to upload</Text>
          {UPLOAD_OPTIONS.map(({ type, label }) => (
            <Pressable
              key={type}
              onPress={() => { onSelect(type); onClose(); }}
              hitSlop={4}
              style={({ pressed }) => [uStyles.option, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[uStyles.optionIcon, { backgroundColor: DOC_COLORS[type] + "20" }]}>
                <Feather name={DOC_ICONS[type] as any} size={18} color={DOC_COLORS[type]} />
              </View>
              <Text style={[uStyles.optionLabel, { color: colors.foreground }]}>{label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const uStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" as const },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sub: { fontSize: 13, marginBottom: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, minHeight: 60 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: "500" as const },
});

// ─────────────────────────────────────────────
// Document Card
// ─────────────────────────────────────────────

function DocumentCard({ doc, onPress }: { doc: LoadDocument; onPress: () => void }) {
  const colors = useColors();
  const docColor = DOC_COLORS[doc.type];
  const statusColor = STATUS_COLORS[doc.status];
  const needsAction = doc.status === "needs_driver_sig";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        cardStyles.card,
        { backgroundColor: colors.card, borderColor: needsAction ? "#F59E0B60" : colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {needsAction && <View style={cardStyles.actionStripe} />}
      <View style={[cardStyles.icon, { backgroundColor: docColor + "20" }]}>
        <Feather name={DOC_ICONS[doc.type] as any} size={20} color={docColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[cardStyles.name, { color: colors.foreground }]} numberOfLines={1}>{doc.name}</Text>
        <Text style={[cardStyles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {DOC_LABELS[doc.type]} · {doc.uploadedBy} · {fmtDate(doc.uploadedAt)}
        </Text>
        {doc.signatures.length > 0 && (
          <Text style={[cardStyles.sigCount, { color: "#10B981" }]}>
            {doc.signatures.length} signature{doc.signatures.length !== 1 ? "s" : ""} collected
          </Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <View style={[cardStyles.statusPill, { backgroundColor: statusColor + "20" }]}>
          <Text style={[cardStyles.statusText, { color: statusColor }]}>{STATUS_LABELS[doc.status]}</Text>
        </View>
        <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14, overflow: "hidden", position: "relative", minHeight: 72 },
  actionStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#F59E0B", borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  name: { fontSize: 14, fontWeight: "700" as const },
  sub: { fontSize: 12, marginTop: 2 },
  sigCount: { fontSize: 11, marginTop: 3, fontWeight: "500" as const },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: "600" as const },
});

// ─────────────────────────────────────────────
// Screen state — only ONE modal open at a time
//
// iOS cannot show two <Modal> components simultaneously.
// We manage a single "activeView" enum so only one
// modal is mounted at once. Transitions:
//   detail → close → sign (via pendingSign ref)
//   sign   → close → detail (re-open same doc)
// ─────────────────────────────────────────────

type ActiveView =
  | { kind: "detail"; docId: string }
  | { kind: "sign";   docId: string; fieldType: SigFieldType }
  | { kind: "upload" }
  | null;

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentLoad, documents, signDocument, addDocument, driverName } = useApp();

  const [activeView, setActiveView] = useState<ActiveView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const needsAction = documents.filter((d) => d.status === "needs_driver_sig").length;
  const allDriverDone =
    documents.filter((d) => d.requiresDriverSig).length > 0 &&
    documents.filter((d) => d.requiresDriverSig).every((d) =>
      d.signatures.some((s) => s.role === "Driver")
    );

  // ── detail doc resolved from state ──────────
  const detailDoc = activeView?.kind === "detail"
    ? documents.find((d) => d.id === activeView.docId) ?? null
    : null;

  // ── When user taps "Sign" in detail modal ──
  // Close detail first, then open sig modal in next render.
  const handleSignRequest = (docId: string, fieldType: SigFieldType) => {
    setActiveView({ kind: "sign", docId, fieldType });
  };

  // ── Save signature ───────────────────────────
  const handleSaveSignature = (data: {
    signatureData: string;
    signatureType: "drawn" | "typed";
    fieldType: SigFieldType;
  }) => {
    if (activeView?.kind !== "sign") return;
    const { docId } = activeView;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    signDocument(docId, data);
    // Reopen detail modal so user sees the updated doc with new signature
    setActiveView({ kind: "detail", docId });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Documents</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {documents.length} doc{documents.length !== 1 ? "s" : ""} · {currentLoad.loadNumber}
          </Text>
        </View>
        <Pressable
          onPress={() => setActiveView({ kind: "upload" })}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: botPad, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <SigningTimeline docs={documents} loadStatus={currentLoad.status} />

        {needsAction > 0 && (
          <View style={[styles.actionBanner, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)" }]}>
            <Feather name="alert-triangle" size={16} color="#F59E0B" />
            <Text style={[styles.actionBannerText, { color: "#F59E0B" }]}>
              {needsAction} document{needsAction !== 1 ? "s" : ""} require{needsAction === 1 ? "s" : ""} your signature
            </Text>
          </View>
        )}

        {allDriverDone && (
          <View style={[styles.actionBanner, { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.35)" }]}>
            <Feather name="check-circle" size={16} color="#10B981" />
            <Text style={[styles.actionBannerText, { color: "#10B981" }]}>
              All signatures collected. Waiting for clerk approval.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Load Documents</Text>

        {documents.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file" size={36} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Documents Yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tap "Add" to upload a BOL, POD, or other document
            </Text>
          </View>
        ) : (
          documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onPress={() => setActiveView({ kind: "detail", docId: doc.id })}
            />
          ))
        )}
      </ScrollView>

      {/* ── Single modal at a time ── */}

      {/* Detail modal */}
      <DocumentDetailModal
        doc={detailDoc}
        visible={activeView?.kind === "detail"}
        onClose={() => setActiveView(null)}
        onSign={(fieldType) => {
          if (activeView?.kind === "detail") {
            handleSignRequest(activeView.docId, fieldType);
          }
        }}
      />

      {/* Signature capture modal */}
      <SignatureModal
        visible={activeView?.kind === "sign"}
        onClose={() => {
          // Go back to detail modal if we came from one
          if (activeView?.kind === "sign") {
            setActiveView({ kind: "detail", docId: activeView.docId });
          }
        }}
        onSave={handleSaveSignature}
        fieldType={activeView?.kind === "sign" ? activeView.fieldType : "signature"}
        signerName={driverName}
        loadNumber={currentLoad.loadNumber}
        facilityName={currentLoad.deliveryFacility}
      />

      {/* Upload sheet */}
      <UploadSheet
        visible={activeView?.kind === "upload"}
        onClose={() => setActiveView(null)}
        onSelect={(type) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          addDocument(type);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  headerSub: { fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600" as const },
  actionBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  actionBannerText: { fontSize: 13, fontWeight: "500" as const, flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  emptyState: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
