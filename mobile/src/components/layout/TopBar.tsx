import { useRouter } from "expo-router";
import { House } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { AuthButton } from "./AuthButton";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to launcher"
        onPress={() => router.replace("/")}
        style={{
          minHeight: 38,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 7
        }}
      >
        <House size={15} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "800" }}>Launcher</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <ThemeToggle />
      <AuthButton />
    </View>
  );
}
