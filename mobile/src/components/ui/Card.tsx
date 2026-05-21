import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function Card({ children, style, elevated }: PropsWithChildren<{ style?: ViewStyle; elevated?: boolean }>) {
 const { colors } = useTheme();
 const styles = makeStyles(colors);
 return <View style={[styles.card, elevated ? styles.elevated : null, style]}>{children}</View>;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4
  }
});
