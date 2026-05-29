import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { SigFieldType } from "@/context/AppContext";

interface SavePayload {
  signatureData: string;
  signatureType: "drawn" | "typed";
  fieldType: SigFieldType;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => void;
  fieldType?: SigFieldType;
  signerName: string;
  loadNumber: string;
  facilityName: string;
}

const CANVAS_HEIGHT = 180;
const TYPED_NAMES = [
  "James Morrison", "J. Morrison", "JM", "James M.",
];

export function SignatureModal({ visible, onClose, onSave, fieldType = "signature", signerName, loadNumber, facilityName }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedText, setTypedText] = useState(signerName);
  const [strokes, setStrokes] = useState<string[]>([]);
  const activeStroke = useRef<string>("");
  const strokeCount = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        strokeCount.current++;
        activeStroke.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
        setStrokes((s) => [...s, activeStroke.current]);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        activeStroke.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        setStrokes((s) => [...s.slice(0, -1), activeStroke.current]);
      },
      onPanResponderRelease: () => {
        activeStroke.current = "";
      },
    })
  ).current;

  const handleClear = useCallback(() => {
    setStrokes([]);
    activeStroke.current = "";
  }, []);

  const handleSave = useCallback(() => {
    if (mode === "draw") {
      if (strokes.length === 0) return;
      onSave({ signatureData: strokes.join("|"), signatureType: "drawn", fieldType });
    } else {
      if (!typedText.trim()) return;
      onSave({ signatureData: typedText.trim(), signatureType: "typed", fieldType });
    }
  }, [mode, strokes, typedText, fieldType, onSave]);

  const canSave = mode === "draw" ? strokes.length > 0 : typedText.trim().length > 0;

  const fieldLabel =
    fieldType === "signature" ? "Signature" :
    fieldType === "initials" ? "Initials" : "Printed Name";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 12) + 10 : insets.top + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Capture {fieldLabel}</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{loadNumber} · {facilityName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* Mode Tabs */}
          <View style={[styles.modeTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["draw", "type"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeTab, { backgroundColor: mode === m ? colors.primary : "transparent" }]}
              >
                <Feather name={m === "draw" ? "edit-3" : "type"} size={15} color={mode === m ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.modeTabText, { color: mode === m ? colors.primaryForeground : colors.mutedForeground }]}>
                  {m === "draw" ? "Draw Signature" : "Type Signature"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Draw Canvas */}
          {mode === "draw" ? (
            <View style={{ marginHorizontal: 16, marginTop: 12 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Draw your {fieldLabel.toLowerCase()} below</Text>
              <View
                style={[styles.canvas, { backgroundColor: colors.card, borderColor: strokes.length > 0 ? colors.primary : colors.border }]}
                {...panResponder.panHandlers}
              >
                <Svg width="100%" height={CANVAS_HEIGHT} style={{ flex: 1 }}>
                  {strokes.map((d, i) => (
                    <Path
                      key={i}
                      d={d}
                      stroke={colors.foreground}
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </Svg>
                {strokes.length === 0 && (
                  <View style={[styles.canvasPlaceholder, { pointerEvents: "none" }]}>
                    <Feather name="edit-3" size={22} color={colors.border} />
                    <Text style={[styles.canvasPlaceholderText, { color: colors.border }]}>
                      Sign here with your finger
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.canvasActions}>
                <Pressable
                  onPress={handleClear}
                  style={[styles.clearBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>Clear</Text>
                </Pressable>
                <Text style={[styles.strokeCount, { color: colors.mutedForeground }]}>
                  {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Typed suggestions */}
              {fieldType === "initials" && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Or tap to use initials</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {["JM", "J.M.", "J.Mo."].map((init) => (
                      <Pressable
                        key={init}
                        onPress={() => { setMode("type"); setTypedText(init); }}
                        style={[styles.suggestionChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Text style={[styles.suggestionChipText, { color: colors.foreground }]}>{init}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type your {fieldLabel.toLowerCase()}</Text>
              <TextInput
                value={typedText}
                onChangeText={setTypedText}
                style={[styles.typeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder={fieldType === "initials" ? "JM" : signerName}
                autoFocus
              />
              {typedText.trim().length > 0 && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Preview</Text>
                  <View style={[styles.typePreview, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                    <Text style={[styles.typePreviewText, { color: colors.foreground }]}>{typedText}</Text>
                  </View>
                </>
              )}
              {fieldType === "signature" && (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Quick fill</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {TYPED_NAMES.map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setTypedText(n)}
                        style={[styles.suggestionChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Text style={[styles.suggestionChipText, { color: colors.foreground }]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Metadata */}
          <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metaTitle, { color: colors.mutedForeground }]}>Signature will include</Text>
            {[
              { icon: "user", label: "Signer", val: signerName },
              { icon: "briefcase", label: "Role", val: "Driver" },
              { icon: "calendar", label: "Date & Time", val: `${dateStr} ${timeStr}` },
              { icon: "map-pin", label: "Facility", val: facilityName },
              { icon: "hash", label: "Load #", val: loadNumber },
            ].map(({ icon, label, val }) => (
              <View key={label} style={styles.metaRow}>
                <Feather name={icon as any} size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.metaVal, { color: colors.foreground }]} numberOfLines={1}>{val}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            By saving, you confirm this is your authorized signature for the above load and facility.
          </Text>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: canSave ? colors.primary : colors.secondary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="check-circle" size={20} color={canSave ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.saveBtnText, { color: canSave ? colors.primaryForeground : colors.mutedForeground }]}>
              Save {fieldLabel}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" as const },
  headerSub: { fontSize: 12, marginTop: 2 },
  modeTabs: { flexDirection: "row", borderRadius: 14, borderWidth: 1, margin: 16, padding: 4, gap: 4 },
  modeTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  modeTabText: { fontSize: 13, fontWeight: "600" as const },
  label: { fontSize: 12, fontWeight: "500" as const, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  canvas: { height: CANVAS_HEIGHT, borderRadius: 14, borderWidth: 2, overflow: "hidden", position: "relative" },
  canvasPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8 },
  canvasPlaceholderText: { fontSize: 14 },
  canvasActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  clearBtnText: { fontSize: 13, fontWeight: "500" as const },
  strokeCount: { fontSize: 12 },
  typeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18 },
  typePreview: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 20, alignItems: "center" },
  typePreviewText: { fontSize: 28, fontStyle: "italic", fontWeight: "300" as const },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  suggestionChipText: { fontSize: 13, fontWeight: "500" as const },
  metaCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  metaTitle: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaLabel: { fontSize: 13, width: 90 },
  metaVal: { flex: 1, fontSize: 13, fontWeight: "500" as const, textAlign: "right" },
  disclaimer: { marginHorizontal: 16, marginTop: 12, fontSize: 11, lineHeight: 16, textAlign: "center" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: 14, marginHorizontal: 16, marginTop: 20 },
  saveBtnText: { fontSize: 17, fontWeight: "700" as const },
});
