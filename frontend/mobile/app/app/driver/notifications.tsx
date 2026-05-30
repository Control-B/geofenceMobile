import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppNotification } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const NOTIF_ICONS: Record<AppNotification["type"], string> = {
  dock_assigned: "anchor",
  loading_ready: "package",
  delay: "alert-triangle",
  gate: "sliders",
  appointment: "clock",
  departure: "log-out",
  arrival: "map-pin",
  document: "file-text",
};

const NOTIF_COLORS: Record<AppNotification["type"], string> = {
  dock_assigned: "#3B82F6",
  loading_ready: "#10B981",
  delay: "#EF4444",
  gate: "#F59E0B",
  appointment: "#8B5CF6",
  departure: "#94A3B8",
  arrival: "#10B981",
  document: "#6366F1",
};

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { driverNotifications, unreadCount, markNotificationsRead } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 118 : insets.bottom + 80;

  const handleMarkRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markNotificationsRead();
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconColor = NOTIF_COLORS[item.type] ?? colors.primary;
    return (
      <View style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }, !item.read && { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "22" }]}>
          <Feather name={NOTIF_ICONS[item.type] as never} size={20} color={iconColor} />
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifTop}>
            <Text style={[styles.notifTitle, { color: colors.foreground }, !item.read && { fontWeight: "700" as const }]}>
              {item.title}
            </Text>
            <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeAgo(item.time)}</Text>
          </View>
          <Text style={[styles.notifMsg, { color: colors.mutedForeground }]}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Alerts</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkRead}>
            <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={driverNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: botPad, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="bell-off" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Alerts</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>You'll see dock assignments and facility updates here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
  markReadText: { fontSize: 14, fontWeight: "500" as const },
  notifCard: { flexDirection: "row", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifBody: { flex: 1, gap: 4 },
  notifTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  notifTitle: { fontSize: 14, flex: 1 },
  notifTime: { fontSize: 12, flexShrink: 0 },
  notifMsg: { fontSize: 13, lineHeight: 18 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
