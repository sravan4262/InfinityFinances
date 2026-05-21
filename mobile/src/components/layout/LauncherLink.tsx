import { useRouter } from "expo-router";
import { House } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function LauncherLink() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Return to launcher"
      onPress={() => router.replace("/")}
      style={{
        alignSelf: "flex-start",
        minHeight: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 12
      }}
    >
      <House size={15} color={colors.mutedForeground} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "800" }}>Launcher</Text>
    </Pressable>
  );
}
