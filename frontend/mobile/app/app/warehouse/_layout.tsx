import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

function NativeWarehouseTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "list.bullet.rectangle.portrait", selected: "list.bullet.rectangle.portrait.fill" }} />
        <Label>Queue</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="docks">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Docks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="yard">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Yard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="console">
        <Icon sf={{ default: "checkmark.seal", selected: "checkmark.seal.fill" }} />
        <Label>Console</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicWarehouseTabs() {
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Queue",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="list.bullet.rectangle.portrait" tintColor={color} size={22} /> : <Feather name="list" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="docks"
        options={{
          title: "Docks",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="square.grid.2x2" tintColor={color} size={22} /> : <Feather name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="yard"
        options={{
          title: "Yard",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="map" tintColor={color} size={22} /> : <Feather name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="console"
        options={{
          title: "Console",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="checkmark.seal" tintColor={color} size={22} /> : <Feather name="check-circle" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function WarehouseTabLayout() {
  return isLiquidGlassAvailable() ? <NativeWarehouseTabs /> : <ClassicWarehouseTabs />;
}
