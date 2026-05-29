import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function IndexScreen() {
  const colors = useColors();
  const { role, roleLoaded } = useApp();

  useEffect(() => {
    if (!roleLoaded) return;
    if (role === "driver") {
      router.replace("/driver");
    } else if (role === "warehouse") {
      router.replace("/warehouse");
    } else {
      router.replace("/role-select");
    }
  }, [role, roleLoaded]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
