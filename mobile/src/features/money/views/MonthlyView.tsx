import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "@/lib/money/types";
import {
  buildWeeklyBreakdown,
  monthRange,
  monthsInYear,
  shortMonthLabel,
  totalsByKind,
  txInMonth,
  txInRange
} from "@/lib/money/selectors";
import { todayYmd } from "@/lib/money/recurrence";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export function MonthlyView({
  month,
  transactions,
  onSelectMonth
}: {
  month: string;
  transactions: Transaction[];
  onSelectMonth: (month: string) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const year = Number(month.slice(0, 4));
  const yearMonths = monthsInYear(year);
  const yearTotals = totalsByKind(yearMonths.flatMap((item) => txInMonth(transactions, item)));
  const yearNet = yearTotals.income - yearTotals.expense;
  const today = todayYmd();
  const todayMonth = today.slice(0, 7);
  const weeklyBreakdown = buildWeeklyBreakdown(month).map((week) => ({
    ...week,
    totals: totalsByKind(txInRange(transactions, week.from, week.to))
  }));

  return (
    <View style={styles.content}>
      <View style={styles.yearCard}>
        <Text style={styles.yearLabel}>{year}</Text>
        <View style={styles.yearTotalsRow}>
          <Text style={styles.income}>{formatCurrency(yearTotals.income)}</Text>
          <Text style={styles.expense}>{formatCurrency(yearTotals.expense)}</Text>
          <Text style={[styles.net, { color: yearNet >= 0 ? colors.foreground : colors.destructive }]}>{formatCurrency(yearNet)}</Text>
        </View>
      </View>

      <View style={styles.listCard}>
        {yearMonths
          .slice()
          .reverse()
          .map((item) => {
            const itemTotals = totalsByKind(txInMonth(transactions, item));
            const itemNet = itemTotals.income - itemTotals.expense;
            const isCurrent = item === month;
            const isFuture = item > todayMonth;
            const range = monthRange(item);
            const rangeShort = `${range.from.slice(5).replace("-", "/")} ~ ${range.to.slice(5).replace("-", "/")}`;
            return (
              <Pressable
                key={item}
                onPress={() => onSelectMonth(item)}
                style={[styles.monthRow, isCurrent ? styles.currentMonthRow : null, isFuture ? styles.futureMonthRow : null]}
              >
                <View style={styles.monthLeft}>
                  <Text style={[styles.monthLabel, isCurrent ? styles.monthLabelActive : null]}>{shortMonthLabel(item)}</Text>
                  <Text style={styles.monthRange}>{rangeShort}</Text>
                </View>
                <View style={styles.monthRight}>
                  <Text style={styles.income}>{formatCurrency(itemTotals.income)}</Text>
                  <Text style={styles.expense}>{formatCurrency(itemTotals.expense)}</Text>
                  <Text style={[styles.net, { color: itemNet >= 0 ? colors.mutedForeground : colors.destructive }]}>
                    {formatCurrency(itemNet)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
      </View>

      <Text style={styles.sectionLabel}>Weeks in {shortMonthLabel(month)}</Text>
      <View style={styles.listCard}>
        {weeklyBreakdown.map((week) => {
          const isCurrent = today >= week.from && today <= week.to;
          return (
            <View key={week.from} style={[styles.weekRow, isCurrent ? styles.currentWeekRow : null]}>
              <Text style={styles.weekLabel}>{week.label}</Text>
              <View style={styles.weekRight}>
                <Text style={[styles.income, week.totals.income === 0 ? styles.dim : null]}>{formatCurrency(week.totals.income)}</Text>
                <Text style={[styles.expense, week.totals.expense === 0 ? styles.dim : null]}>{formatCurrency(week.totals.expense)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12 },
  yearCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  yearLabel: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  yearTotalsRow: { flexDirection: "row", gap: 12 },
  income: { color: colors.success, fontWeight: "800", fontSize: 12 },
  expense: { color: colors.destructive, fontWeight: "800", fontSize: 12 },
  net: { fontWeight: "900", fontSize: 12 },
  dim: { color: colors.mutedForeground },
  listCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: "hidden" },
  monthRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  currentMonthRow: { backgroundColor: colors.primaryWash },
  futureMonthRow: { opacity: 0.4 },
  monthLeft: { width: 90 },
  monthLabel: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  monthLabelActive: { color: colors.primary },
  monthRange: { color: colors.mutedForeground, fontSize: 10, marginTop: 2 },
  monthRight: { flexDirection: "row", gap: 12, alignItems: "center" },
  sectionLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4, paddingHorizontal: 4 },
  weekRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  currentWeekRow: { backgroundColor: "rgba(220, 38, 38, 0.08)" },
  weekLabel: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700" },
  weekRight: { flexDirection: "row", gap: 12 }
});
