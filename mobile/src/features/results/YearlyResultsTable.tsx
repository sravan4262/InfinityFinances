import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, YearlyRow } from "@/lib/engine/types";

const PREVIEW_ROWS = 5;

export function YearlyResultsTable({
  rows,
  fireAge,
  currency
}: {
  rows: YearlyRow[];
  fireAge: number | null;
  currency: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  const truncated = rows.length > PREVIEW_ROWS;
  const visible = truncated ? rows.slice(0, PREVIEW_ROWS) : rows;

  const tableBody = (data: YearlyRow[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell, styles.ageCell]}>Age</Text>
          <Text style={[styles.cell, styles.headerCell, styles.dataCell]}>Year</Text>
          <Text style={[styles.cell, styles.headerCell, styles.dataCellWide, styles.right]}>Portfolio</Text>
          <Text style={[styles.cell, styles.headerCell, styles.dataCell, styles.right]}>Savings</Text>
          <Text style={[styles.cell, styles.headerCell, styles.dataCellWide, styles.right]}>Spending</Text>
          <Text style={[styles.cell, styles.headerCell, styles.dataCell, styles.right]}>Gap</Text>
        </View>
        {data.map((row) => {
          const isFireRow = row.isFire && row.age === fireAge;
          const rowStyle = isFireRow
            ? styles.fireRow
            : row.isRetired
            ? styles.retiredRow
            : null;
          return (
            <View key={row.age} style={[styles.row, rowStyle]}>
              <View style={[styles.cell, styles.ageCell, styles.ageRow]}>
                <Text style={styles.ageText}>{row.age}</Text>
                {isFireRow ? <Flame size={11} color={colors.primary} /> : null}
              </View>
              <Text style={[styles.cell, styles.dataCell, styles.muted]}>{row.year}</Text>
              <Text style={[styles.cell, styles.dataCellWide, styles.right, row.portfolio <= 0 ? styles.danger : styles.value]}>
                {formatCurrency(row.portfolio, true, currency)}
              </Text>
              <Text style={[styles.cell, styles.dataCell, styles.right, styles.success]}>
                {row.annualSavings > 0 ? `+${formatCurrency(row.annualSavings, true, currency)}` : "—"}
              </Text>
              <Text style={[styles.cell, styles.dataCellWide, styles.right, styles.muted]}>
                {formatCurrency(row.annualSpending, true, currency)}
              </Text>
              <Text style={[styles.cell, styles.dataCell, styles.right, row.fireGap >= 0 ? styles.success : styles.muted]}>
                {row.fireGap >= 0 ? "✓" : formatCurrency(row.fireGap, true, currency)}
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
          <Text style={styles.title}>Year-by-year projection</Text>
          <Text style={styles.subtitle}>{rows.length} years</Text>
        </View>
        <ExpandButton onPress={() => setFullscreen(true)} />
      </View>
      {tableBody(visible)}
      {truncated ? (
        <Text style={styles.truncatedHint}>Showing {PREVIEW_ROWS} of {rows.length} · tap Expand for all</Text>
      ) : null}
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Year-by-year projection"
        subtitle={`${rows.length} years · scroll horizontally to see every column`}
      >
        {tableBody(rows)}
      </FullscreenModal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, overflow: "hidden" },
  header: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerText: { flexShrink: 1, gap: 2 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 11 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { backgroundColor: colors.cardElevated },
  fireRow: { backgroundColor: colors.primaryWash },
  retiredRow: { backgroundColor: colors.cardElevated },
  cell: { paddingHorizontal: 10, paddingVertical: 9, fontSize: 12, color: colors.foreground },
  headerCell: { color: colors.mutedForeground, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  ageCell: { width: 64 },
  ageRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ageText: { color: colors.foreground, fontWeight: "900", fontSize: 12 },
  dataCell: { width: 80 },
  dataCellWide: { width: 110 },
  right: { textAlign: "right" },
  muted: { color: colors.mutedForeground },
  value: { color: colors.foreground, fontWeight: "700" },
  success: { color: colors.success, fontWeight: "700" },
  danger: { color: colors.destructive, fontWeight: "800" },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", paddingVertical: 10, textAlign: "center", borderTopWidth: 1, borderTopColor: colors.border }
});
