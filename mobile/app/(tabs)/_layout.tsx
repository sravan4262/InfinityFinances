import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="retire" />
      <Stack.Screen name="home/index" />
      <Stack.Screen name="budget/index" />
      <Stack.Screen name="tracker/index" />
    </Stack>
  );
}
