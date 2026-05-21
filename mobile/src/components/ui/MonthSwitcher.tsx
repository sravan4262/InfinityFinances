import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function MonthSwitcher({
  label,
  onPrev,
  onNext,
  showTodayLink,
  onToday
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  showTodayLink?: boolean;
  onToday?: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} style={styles.arrow}><ChevronLeft color={colors.foreground} /></Pressable>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        {showTodayLink && onToday ? (
          <Pressable onPress={onToday} hitSlop={8}>
            <Text style={styles.todayLink}>today</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={onNext} style={styles.arrow}><ChevronRight color={colors.foreground} /></Pressable>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { padding: 12 },
  center: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: colors.foreground, fontWeight: "900" },
  todayLink: { color: colors.primary, fontWeight: "800", fontSize: 11 }
});
