import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { NumberField } from "@/components/ui/NumberField";
import { ProgressBar } from "@/components/ui/Sparkline";
import type { MoneyCategory } from "@/lib/money/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

const PREVIEW_ROWS = 5;

export function BudgetView({
  rows,
  budgetTotal,
  spentTotal,
  onSetBudget
}: {
  rows: { category: MoneyCategory; amount: number; spent: number; remaining: number }[];
  budgetTotal: number;
  spentTotal: number;
  onSetBudget: (categoryId: string, amount: number) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  const remaining = Math.max(0, budgetTotal - spentTotal);
  const usage = budgetTotal ? spentTotal / budgetTotal : 0;
  const pct = Math.min(100, usage * 100);
  if (spentTotal <= 0 && budgetTotal <= 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>No expenses this month yet.</Text>
      </View>
    );
  }
  const truncated = rows.length > PREVIEW_ROWS;
  const previewRows = truncated ? rows.slice(0, PREVIEW_ROWS) : rows;

  const renderTable = (data: typeof rows) => (
    <View style={styles.tableCard}>
      <View style={styles.headerRowCells}>
        <Text style={[styles.headerCell, styles.categoryCol]}>Category</Text>
        <Text style={[styles.headerCell, styles.spentCol]}>Spent</Text>
        <Text style={[styles.headerCell, styles.budgetCol]}>Budget</Text>
      </View>
      {data.map((row) => {
        const isOver = row.amount > 0 && row.spent > row.amount;
        return (
          <View key={row.category.id} style={styles.categoryRow}>
            <View style={[styles.categoryCol, styles.categoryLeft]}>
              <View style={[styles.dot, { backgroundColor: row.category.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryLabel} numberOfLines={1}>{row.category.label}</Text>
                {row.amount > 0 ? (
                  <Text style={[styles.remainingHint, { color: isOver ? colors.destructive : colors.mutedForeground }]}>
                    {isOver ? "Over " : "Left "}
                    {formatCurrency(Math.abs(row.remaining), true)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={[styles.spent, styles.spentCol, isOver ? styles.spentOver : null]}>
              {row.spent > 0 ? formatCurrency(row.spent) : "—"}
            </Text>
            <View style={styles.budgetCol}>
              <NumberField
                label=""
                value={row.amount}
                onChange={(amount) => onSetBudget(row.category.id, amount)}
                prefix="$"
                format="currency"
                placeholder="0"
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Remaining</Text>
            <Text style={styles.remaining}>{formatCurrency(remaining)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.eyebrow}>Budget</Text>
            <Text style={styles.budgetTotal}>{formatCurrency(budgetTotal)}</Text>
          </View>
        </View>
        <View style={styles.progressWrap}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Spent {formatCurrency(spentTotal)}</Text>
            <Text style={styles.progressText}>{pct.toFixed(0)}%</Text>
          </View>
          <ProgressBar value={spentTotal} max={Math.max(budgetTotal, spentTotal, 1)} color={budgetProgressColor(usage, colors)} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        {truncated ? <ExpandButton onPress={() => setFullscreen(true)} /> : null}
      </View>
      {renderTable(previewRows)}
      {truncated ? <Text style={styles.truncatedHint}>Showing {PREVIEW_ROWS} of {rows.length} · tap Expand for all</Text> : null}
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Budgets"
        subtitle={`${rows.length} categories`}
      >
        {renderTable(rows)}
      </FullscreenModal>
    </View>
  );
}

function budgetProgressColor(usage: number, colors: ReturnType<typeof useTheme>["colors"]) {
  if (usage >= 1) return colors.destructive;
  if (usage >= 0.75) return colors.warning;
  return colors.primary;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12 },
  emptyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 28, alignItems: "center" },
  empty: { color: colors.mutedForeground, fontSize: 13 },
  headerCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  right: { alignItems: "flex-end" },
  eyebrow: { color: colors.mutedForeground, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  remaining: { color: colors.foreground, fontSize: 24, fontWeight: "900", marginTop: 4 },
  budgetTotal: { color: colors.foreground, fontSize: 14, fontWeight: "800", marginTop: 4 },
  progressWrap: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700" },
  tableCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: "hidden" },
  headerRowCells: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8, backgroundColor: colors.cardElevated },
  headerCell: { color: colors.mutedForeground, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  categoryCol: { flex: 1.6 },
  spentCol: { width: 80, textAlign: "right" },
  budgetCol: { width: 110 },
  categoryRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "center", gap: 8 },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  categoryLabel: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  remainingHint: { fontSize: 10, marginTop: 2 },
  spent: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  spentOver: { color: colors.destructive },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textAlign: "center" }
});
