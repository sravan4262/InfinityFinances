import { MoonStar, SunMedium, SunMoon } from "lucide-react-native";
import { Pressable } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
export function ThemeToggle() {
  const { colors, preference, cycleTheme } = useTheme();
  const Icon = preference === "light" ? SunMedium : preference === "dark" ? MoonStar : SunMoon;
  return <Pressable accessibilityLabel="Toggle theme" onPress={cycleTheme} style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: "center" }}><Icon color={colors.foreground} size={20} /></Pressable>;
}
