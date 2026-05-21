import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { formatCurrency } from "@/lib/utils";
import type { FireCurrency, RetirementSensitivityRow } from "@/lib/engine/types";
import { useTheme } from "@/theme/ThemeProvider";

export function RetirementSensitivityTable({
  rows,
  plannedRetirementAge,
  currency
}: {
  rows: RetirementSensitivityRow[];
  plannedRetirementAge: number;
  currency?: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  if (!rows.length) return null;

  const tableBody = (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.ageCell, styles.head]}>Retire at</Text>
          <Text style={[styles.cell, styles.moneyCell, styles.head, styles.right]}>Corpus needed</Text>
          <Text style={[styles.cell, styles.moneyCell, styles.head, styles.right]}>Projected</Text>
          <Text style={[styles.cell, styles.moneyCell, styles.head, styles.right]}>Gap</Text>
          <Text style={[styles.cell, styles.moneyCell, styles.head, styles.right]}>Mo. savings ref</Text>
        </View>
        {rows.map((row) => {
          const planned = row.retirementAge === plannedRetirementAge;
          const surplus = row.shortfall <= 0;
          return (
            <View key={row.retirementAge} style={[styles.row, planned ? styles.plannedRow : null]}>
              <View style={[styles.cell, styles.ageCell, styles.ageWrap]}>
                <Text style={[styles.ageText, planned ? styles.plannedText : null]}>Age {row.retirementAge}</Text>
                {planned ? <Text style={styles.badge}>planned</Text> : null}
              </View>
              <Text style={[styles.cell, styles.moneyCell, styles.right]}>{formatCurrency(row.requiredCorpus, true, currency)}</Text>
              <Text style={[styles.cell, styles.moneyCell, styles.right]}>{formatCurrency(row.projectedPortfolio, true, currency)}</Text>
              <Text style={[styles.cell, styles.moneyCell, styles.right, surplus ? styles.success : styles.warning]}>
                {surplus ? "+" : "-"}{formatCurrency(Math.abs(row.shortfall), true, currency)}
              </Text>
              <Text style={[styles.cell, styles.moneyCell, styles.right, styles.muted]}>
                {row.monthlySavingsNeeded > 1e9 ? "-" : `${formatCurrency(row.monthlySavingsNeeded, true, currency)}/mo`}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Retirement age sensitivity</Text>
          <Text style={styles.subtitle}>Corpus needed, projected value, gap, and savings reference by retirement age.</Text>
        </View>
        <ExpandButton onPress={() => setFullscreen(true)} />
      </View>
      {tableBody}
      <Text style={styles.footnote}>All values in today&apos;s dollars. Gap = projected portfolio - required corpus.</Text>
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Retirement age sensitivity"
        subtitle="Corpus needed, projected value, gap, and savings reference by retirement age."
      >
        {tableBody}
      </FullscreenModal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  ageCell: { width: 104 },
  ageText: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  ageWrap: { alignItems: "center", flexDirection: "row", gap: 5 },
  badge: { backgroundColor: colors.primaryWash, borderRadius: 5, color: colors.primary, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 5, paddingVertical: 2 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cell: { color: colors.foreground, fontSize: 12, minHeight: 38, paddingHorizontal: 10, paddingVertical: 10 },
  footnote: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16, padding: 12 },
  head: { color: colors.mutedForeground, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  header: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 14 },
  headerText: { flexShrink: 1, gap: 4 },
  headerRow: { backgroundColor: colors.cardElevated },
  moneyCell: { width: 116 },
  muted: { color: colors.mutedForeground },
  plannedRow: { backgroundColor: colors.primaryWash },
  plannedText: { color: colors.primary },
  right: { textAlign: "right" },
  row: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row" },
  subtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  success: { color: colors.success, fontWeight: "900" },
  title: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  warning: { color: colors.warning, fontWeight: "900" }
});
