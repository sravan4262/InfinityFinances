import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function FAB({
  onPress,
  icon,
  accessibilityLabel = "Add",
  bottomOffset = 0
}: {
  onPress: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
  bottomOffset?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.button, { bottom: insets.bottom + 16 + bottomOffset, backgroundColor: colors.primary }]}
    >
      {icon ?? <Plus size={26} color={colors.primaryForeground} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: 56,
    zIndex: 20
  }
});
