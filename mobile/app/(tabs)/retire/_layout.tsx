import { Tabs } from "expo-router";
import { BarChart3, Flame, SlidersHorizontal } from "lucide-react-native";
import { selection } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";

export default function RetireLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenListeners={{ tabPress: () => selection() }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        sceneStyle: { backgroundColor: colors.background }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Retire",
          tabBarLabel: "Calculator",
          tabBarIcon: ({ color, size }) => <Flame color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="advanced"
        options={{
          title: "Advanced FIRE",
          tabBarLabel: "Advanced",
          tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "FIRE Results",
          tabBarLabel: "Results",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
