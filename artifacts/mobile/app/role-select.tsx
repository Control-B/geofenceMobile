import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function RoleSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setRole } = useApp();

  const handleSelect = async (role: "driver" | "warehouse") => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setRole(role);
    router.replace(role === "driver" ? "/driver" : "/warehouse");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}>
      <View style={styles.header}>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Feather name="anchor" size={22} color="#fff" />
        </View>
        <Text style={[styles.logoText, { color: colors.foreground }]}>DockFlow</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Warehouse Arrival Platform</Text>
      </View>

      <View style={styles.cards}>
        <Pressable
          onPress={() => handleSelect("driver")}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
            <Feather name="truck" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>Driver</Text>
          <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
            View your load, check in at facilities, and track your dock assignment in real time.
          </Text>
          <View style={[styles.ctaBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Continue as Driver</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleSelect("warehouse")}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
            <Feather name="layers" size={36} color="#8B5CF6" />
          </View>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>Warehouse Staff</Text>
          <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
            Manage arrivals, assign docks, coordinate loading, and track facility operations.
          </Text>
          <View style={[styles.ctaBtn, { backgroundColor: "#8B5CF6" }]}>
            <Text style={[styles.ctaText, { color: "#FFFFFF" }]}>Continue as Warehouse</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: "center", paddingVertical: 32 },
  logoMark: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.8 },
  tagline: { fontSize: 14, marginTop: 4 },
  cards: { flex: 1, gap: 16, justifyContent: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 22, gap: 10 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  iconWrap: { width: 68, height: 68, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  roleTitle: { fontSize: 22, fontWeight: "700" as const },
  roleDesc: { fontSize: 14, lineHeight: 20 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 6 },
  ctaText: { fontSize: 15, fontWeight: "600" as const },
});
