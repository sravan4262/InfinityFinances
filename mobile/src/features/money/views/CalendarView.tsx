import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Transaction } from "@/lib/money/types";
import { buildCalendarGrid, totalsByKind } from "@/lib/money/selectors";
import { todayYmd } from "@/lib/money/recurrence";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export function CalendarView({
  month,
  transactions,
  onSelectDate
}: {
  month: string;
  transactions: Transaction[];
  onSelectDate: (ymd: string) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.calendar}>
      <View style={styles.dowRow}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((label) => <Text key={label} style={[styles.dowText, label === "Sat" ? { color: colors.primary } : label === "Sun" ? { color: colors.destructive } : null]}>{label}</Text>)}</View>
      {buildCalendarGrid(month).map((cell) => {
        const dayTx = transactions.filter((transaction) => transaction.date === cell.ymd);
        const dayTotals = totalsByKind(dayTx);
        const isToday = cell.ymd === todayYmd();
        const weekendTone = !isToday && cell.dow === 5 ? colors.primary : !isToday && cell.dow === 6 ? colors.destructive : null;
        const dayTextStyle = isToday ? styles.dayTextToday : weekendTone ? { ...styles.dayText, color: weekendTone } : styles.dayText;
        return (
          <Pressable key={cell.ymd} onPress={() => onSelectDate(cell.ymd)} style={[styles.dayCell, !cell.inMonth ? styles.dayMuted : null]}>
            <View style={[styles.dayBadge, isToday ? styles.dayBadgeToday : null]}>
              <Text style={dayTextStyle}>{Number(cell.ymd.slice(-2))}</Text>
            </View>
            {dayTotals.income ? <Text style={styles.dayIncome}>+{formatCurrency(dayTotals.income, true)}</Text> : null}
            {dayTotals.expense ? <Text style={styles.dayExpense}>-{formatCurrency(dayTotals.expense, true)}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  dayBadge: { alignSelf: "flex-start", minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  dayBadgeToday: { backgroundColor: colors.primary },
  dayCell: { width: "14.28%", minHeight: 70, padding: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayExpense: { color: colors.destructive, fontSize: 10, fontWeight: "800" },
  dayIncome: { color: colors.success, fontSize: 10, fontWeight: "800" },
  dayMuted: { opacity: 0.32 },
  dayNet: { color: colors.foreground, fontSize: 10, fontWeight: "900" },
  dayText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700" },
  dayTextToday: { color: colors.primaryForeground, fontSize: 12, fontWeight: "900" },
  dowRow: { flexDirection: "row", width: "100%" },
  dowText: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", textAlign: "center", width: "14.28%", paddingBottom: 8 }
});
