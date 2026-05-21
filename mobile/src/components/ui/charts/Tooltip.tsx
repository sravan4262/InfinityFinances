import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

export function ChartTooltip({
  x,
  title,
  rows,
  chartWidth
}: {
  x: number;
  title: string;
  rows: TooltipRow[];
  chartWidth: number;
}) {
  const { colors } = useTheme();
  const width = 168;
  const left = Math.max(8, Math.min(chartWidth - width - 8, x < chartWidth / 2 ? x + 10 : x - width - 10));

  return (
    <View style={[styles.card, { left, borderColor: colors.border, backgroundColor: colors.popover }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: row.color }]} />
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{row.label}</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 10,
    position: "absolute",
    top: 12,
    width: 168,
    zIndex: 5
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  title: {
    fontSize: 12,
    fontWeight: "900"
  },
  value: {
    fontSize: 11,
    fontWeight: "900"
  }
});
