import { StyleSheet, Text, View } from "react-native";
import type { FireCurrency, YearlyRow } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { ProgressBar } from "../Sparkline";

export function YearlyMiniRow({
  row,
  fireNumber,
  currency
}: {
  row: YearlyRow;
  fireNumber: number;
  currency?: FireCurrency;
}) {
  const { colors } = useTheme();
  const reached = row.portfolio >= fireNumber;

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <View style={styles.textRow}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Age {row.age}</Text>
        <Text style={[styles.value, { color: reached ? colors.success : colors.foreground }]}>{formatCurrency(row.portfolio, true, currency)}</Text>
      </View>
      <ProgressBar value={row.portfolio} max={fireNumber} color={reached ? colors.success : colors.primary} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: "700"
  },
  textRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  value: {
    fontWeight: "900"
  },
  wrap: {
    borderBottomWidth: 1,
    gap: 8,
    paddingVertical: 9
  }
});
