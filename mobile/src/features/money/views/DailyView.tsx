import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Repeat } from "lucide-react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { useMoneyStore } from "@/lib/money/store";
import type { Transaction } from "@/lib/money/types";
import { formatYmdLong, groupByDate, totalsByKind } from "@/lib/money/selectors";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

const PREVIEW_DAYS = 5;

export function DailyView({
  label,
  transactions,
  selectedDate,
  onShowMonth,
  onEdit,
  onRemove
}: {
  label: string;
  transactions: Transaction[];
  selectedDate: string | null;
  onShowMonth: () => void;
  onEdit: (transaction: Transaction) => void;
  onRemove: (transaction: Transaction) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  const grouped = groupByDate(transactions);
  const truncated = grouped.length > PREVIEW_DAYS;
  const previewGroups = truncated ? grouped.slice(0, PREVIEW_DAYS) : grouped;

  const renderGroups = (groups: typeof grouped) =>
    groups.map((group) => <DayGroup key={group.date} date={group.date} items={group.items} onEdit={onEdit} onRemove={onRemove} />);

  return (
    <View style={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.headerActions}>
          {selectedDate ? (
            <Pressable onPress={onShowMonth}>
              <Text style={styles.link}>Show month</Text>
            </Pressable>
          ) : null}
          {truncated ? <ExpandButton onPress={() => setFullscreen(true)} /> : null}
        </View>
      </View>
      {grouped.length ? (
        <>
          {renderGroups(previewGroups)}
          {truncated ? <Text style={styles.truncatedHint}>Showing {PREVIEW_DAYS} of {grouped.length} days · tap Expand for all</Text> : null}
        </>
      ) : (
        <Text style={styles.subtitle}>{selectedDate ? "No transactions on this day." : "No transactions this month."}</Text>
      )}
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={label}
        subtitle={`${grouped.length} days · ${transactions.length} transactions`}
      >
        {renderGroups(grouped)}
      </FullscreenModal>
    </View>
  );
}

function TransactionRow({ transaction, onPress, onLongPress }: { transaction: Transaction; onPress: () => void; onLongPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const store = useMoneyStore();
  const category = store.categories.find((item) => item.id === transaction.categoryId);
  const account = store.accounts.find((item) => item.id === transaction.accountId);
  const title = transaction.note || transaction.description || category?.label || "Transaction";
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.txRow}>
      <View style={styles.txCategoryCell}>
        <View style={[styles.txDot, { backgroundColor: category?.color ?? colors.mutedForeground }]} />
        <Text style={styles.txCategoryLabel} numberOfLines={1}>{category?.label ?? "Unknown"}</Text>
      </View>
      <View style={styles.txMid}>
        <View style={styles.txTitleRow}>
          <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
          {transaction.recurrenceId ? <Repeat size={11} color={colors.primary} /> : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>{account?.name ?? "Account"}</Text>
      </View>
      <Text style={[styles.txAmount, { color: transaction.kind === "income" ? colors.success : colors.destructive }]}>
        {transaction.kind === "income" ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

function DayGroup({ date, items, onEdit, onRemove }: { date: string; items: Transaction[]; onEdit: (transaction: Transaction) => void; onRemove: (transaction: Transaction) => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const dateParts = formatYmdLong(date);
  const totals = totalsByKind(items);
  const weekdayTone = dateParts.weekday === "Sat" ? colors.primary : dateParts.weekday === "Sun" ? colors.destructive : colors.mutedForeground;
  return (
    <View style={styles.dayGroupCard}>
      <View style={styles.dayGroupHeader}>
        <View style={styles.dayGroupDate}>
          <Text style={styles.dayGroupNumber}>{dateParts.day}</Text>
          <Text style={[styles.weekdayBadge, { color: weekdayTone, borderColor: weekdayTone }]}>{dateParts.weekday}</Text>
        </View>
        <View style={styles.dayTotals}>
          {totals.income > 0 ? <Text style={styles.dayIncome}>+{formatCurrency(totals.income, true)}</Text> : null}
          {totals.expense > 0 ? <Text style={styles.dayExpense}>-{formatCurrency(totals.expense, true)}</Text> : null}
        </View>
      </View>
      {items.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} onPress={() => onEdit(transaction)} onLongPress={() => onRemove(transaction)} />
      ))}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12 },
  dayExpense: { color: colors.destructive, fontSize: 11, fontWeight: "800" },
  dayGroupCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: "hidden" },
  dayGroupDate: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayGroupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  dayGroupNumber: { color: colors.foreground, fontSize: 22, fontWeight: "900" },
  dayIncome: { color: colors.success, fontSize: 11, fontWeight: "800" },
  dayTotals: { flexDirection: "row", gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textAlign: "center", paddingTop: 4 },
  link: { color: colors.primary, fontWeight: "900" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16 },
  txAmount: { fontWeight: "900", fontSize: 13 },
  txCategoryCell: { width: 84, flexDirection: "row", alignItems: "center", gap: 6 },
  txCategoryLabel: { color: colors.mutedForeground, fontSize: 11, flex: 1 },
  txDot: { width: 7, height: 7, borderRadius: 4 },
  txMid: { flex: 1, gap: 2 },
  txRow: { minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  txTitle: { color: colors.foreground, fontWeight: "800", fontSize: 13 },
  txTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  weekdayBadge: { borderWidth: 1, borderRadius: 999, fontSize: 10, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 2 }
});
