import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DonutChart } from "@/components/ui/charts";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import type { MoneyCategory } from "@/lib/money/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export function StatsView({
  expenseTotal,
  breakdown
}: {
  expenseTotal: number;
  breakdown: { category: MoneyCategory; amount: number }[];
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  if (expenseTotal <= 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>No expenses this month yet.</Text>
      </View>
    );
  }
  const slices = breakdown.map((item) => ({ label: item.category.label, value: item.amount, color: item.category.color }));
  const PREVIEW_ROWS = 5;
  const previewBreakdown = breakdown.slice(0, PREVIEW_ROWS);
  const truncated = breakdown.length > PREVIEW_ROWS;
  return (
    <View style={styles.content}>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderText}>
            <Text style={styles.eyebrow}>Total expense</Text>
            <Text style={styles.totalValue}>{formatCurrency(expenseTotal)}</Text>
          </View>
          <ExpandButton onPress={() => setFullscreen(true)} />
        </View>
        <View style={styles.chartWrap}>
          <DonutChart slices={slices} />
        </View>
      </View>
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Spending breakdown"
        subtitle={`Total ${formatCurrency(expenseTotal)} · tap a slice to highlight it`}
      >
        <View style={styles.expandedDonut}>
          <DonutChart slices={slices} size={280} />
        </View>
        <View style={styles.expandedList}>
          {breakdown.map((item) => {
            const pct = Math.round((item.amount / expenseTotal) * 100);
            return (
              <View key={item.category.id} style={styles.row}>
                <View style={[styles.pctChip, { backgroundColor: withAlpha(item.category.color, 0.18), borderColor: withAlpha(item.category.color, 0.4) }]}>
                  <Text style={[styles.pctText, { color: item.category.color }]}>{pct}%</Text>
                </View>
                <View style={styles.middle}>
                  <View style={[styles.dot, { backgroundColor: item.category.color }]} />
                  <Text style={styles.label} numberOfLines={1}>{item.category.label}</Text>
                </View>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              </View>
            );
          })}
        </View>
      </FullscreenModal>
      <View style={styles.listCard}>
        {previewBreakdown.map((item) => {
          const pct = Math.round((item.amount / expenseTotal) * 100);
          return (
            <View key={item.category.id} style={styles.row}>
              <View style={[styles.pctChip, { backgroundColor: withAlpha(item.category.color, 0.18), borderColor: withAlpha(item.category.color, 0.4) }]}>
                <Text style={[styles.pctText, { color: item.category.color }]}>{pct}%</Text>
              </View>
              <View style={styles.middle}>
                <View style={[styles.dot, { backgroundColor: item.category.color }]} />
                <Text style={styles.label} numberOfLines={1}>{item.category.label}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
          );
        })}
      </View>
      {truncated ? <Text style={styles.truncatedHint}>Showing top {PREVIEW_ROWS} of {breakdown.length} · tap Expand for all</Text> : null}
    </View>
  );
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return color;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12 },
  emptyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 28, alignItems: "center" },
  empty: { color: colors.mutedForeground, fontSize: 13 },
  chartCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 16, gap: 4 },
  chartHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  chartHeaderText: { flexShrink: 1, gap: 2 },
  eyebrow: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { color: colors.destructive, fontSize: 26, fontWeight: "900" },
  chartWrap: { marginTop: 10, alignItems: "center", alignSelf: "stretch" },
  expandedDonut: { alignItems: "center", paddingVertical: 16 },
  expandedList: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  listCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  pctChip: { width: 46, alignItems: "center", paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pctText: { fontSize: 11, fontWeight: "900" },
  middle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: colors.foreground, fontSize: 13, flex: 1 },
  amount: { color: colors.foreground, fontWeight: "800", fontSize: 13 },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textAlign: "center" }
});
