import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function IconButton({
  icon,
  onPress,
  disabled,
  loading
}: {
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : icon}
    </Pressable>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 }
});
