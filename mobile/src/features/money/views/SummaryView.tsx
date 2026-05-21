import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { ProgressBar } from "@/components/ui/Sparkline";
import type { MoneyAccount, MoneyCategory, Transaction } from "@/lib/money/types";
import { totalsByKind } from "@/lib/money/selectors";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

const PREVIEW_ROWS = 5;

export function SummaryView({
  transactions,
  accounts,
  categories,
  budgetTotal,
  spentTotal
}: {
  transactions: Transaction[];
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  budgetTotal: number;
  spentTotal: number;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [accountsFullscreen, setAccountsFullscreen] = useState(false);
  const budgetRemaining = budgetTotal - spentTotal;
  const budgetUsage = budgetTotal ? spentTotal / budgetTotal : 0;
  const budgetPct = Math.min(100, budgetUsage * 100);
  const accountsTruncated = accounts.length > PREVIEW_ROWS;
  const previewAccounts = accountsTruncated ? accounts.slice(0, PREVIEW_ROWS) : accounts;

  const renderAccount = (account: MoneyAccount) => {
    const accountTotals = totalsByKind(transactions.filter((tx) => tx.accountId === account.id));
    return (
      <View key={account.id} style={styles.accountRow}>
        <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
        <Text style={styles.income}>{accountTotals.income > 0 ? `+${formatCurrency(accountTotals.income)}` : ""}</Text>
        <Text style={styles.expense}>{accountTotals.expense > 0 ? formatCurrency(accountTotals.expense) : "—"}</Text>
      </View>
    );
  };

  return (
    <View style={styles.content}>
      <View style={styles.accountsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Accounts</Text>
          {accountsTruncated ? <ExpandButton onPress={() => setAccountsFullscreen(true)} /> : null}
        </View>
        {previewAccounts.map(renderAccount)}
        {accountsTruncated ? <Text style={styles.truncatedHint}>Showing {PREVIEW_ROWS} of {accounts.length} · tap Expand for all</Text> : null}
      </View>
      <FullscreenModal
        open={accountsFullscreen}
        onClose={() => setAccountsFullscreen(false)}
        title="Accounts"
        subtitle={`${accounts.length} accounts`}
      >
        <View style={styles.accountsCard}>
          {accounts.map(renderAccount)}
        </View>
      </FullscreenModal>

      <View style={styles.budgetCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionLabel}>Budget</Text>
            <Text style={styles.budgetRemaining}>{formatCurrency(Math.max(0, budgetRemaining))}</Text>
            <Text style={styles.subtitle}>remaining</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.sectionLabel}>Total</Text>
            <Text style={styles.budgetTotal}>{formatCurrency(budgetTotal)}</Text>
          </View>
        </View>
        <View style={styles.budgetProgress}>
          <View style={styles.budgetProgressHeader}>
            <Text style={styles.budgetProgressText}>Spent {formatCurrency(spentTotal)}</Text>
            <Text style={styles.budgetProgressText}>{budgetPct.toFixed(0)}%</Text>
          </View>
          <ProgressBar value={spentTotal} max={Math.max(budgetTotal, spentTotal, 1)} color={budgetProgressColor(budgetUsage, colors)} />
        </View>
      </View>

      <CategoriesBreakdown transactions={transactions} categories={categories} />
    </View>
  );
}

function CategoriesBreakdown({ transactions, categories }: { transactions: Transaction[]; categories: MoneyCategory[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  const rows = categories
    .map((category) => {
      const amount = transactions
        .filter((tx) => tx.categoryId === category.id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { category, amount };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  if (!rows.length) return null;
  const truncated = rows.length > PREVIEW_ROWS;
  const preview = truncated ? rows.slice(0, PREVIEW_ROWS) : rows;
  const renderRow = (row: { category: MoneyCategory; amount: number }) => (
    <View key={row.category.id} style={styles.categoryRow}>
      <View style={styles.categoryLeft}>
        <View style={[styles.dot, { backgroundColor: row.category.color }]} />
        <Text style={styles.categoryLabel}>{row.category.label}</Text>
      </View>
      <Text style={styles.categoryAmount}>{formatCurrency(row.amount)}</Text>
    </View>
  );
  return (
    <>
      <View style={styles.accountsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Categories</Text>
          {truncated ? <ExpandButton onPress={() => setFullscreen(true)} /> : null}
        </View>
        {preview.map(renderRow)}
        {truncated ? <Text style={styles.truncatedHint}>Showing top {PREVIEW_ROWS} of {rows.length} · tap Expand for all</Text> : null}
      </View>
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Categories"
        subtitle={`${rows.length} categories with spending`}
      >
        <View style={styles.accountsCard}>
          {rows.map(renderRow)}
        </View>
      </FullscreenModal>
    </>
  );
}

function budgetProgressColor(usage: number, colors: ReturnType<typeof useTheme>["colors"]) {
  if (usage >= 1) return colors.destructive;
  if (usage >= 0.75) return colors.warning;
  return colors.primary;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12 },
  accountsCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, paddingVertical: 4, overflow: "hidden" },
  sectionLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  accountRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  accountName: { color: colors.mutedForeground, fontSize: 13, fontWeight: "700", flex: 1 },
  income: { color: colors.success, fontWeight: "800", fontSize: 12, width: 92, textAlign: "right" },
  expense: { color: colors.destructive, fontWeight: "800", fontSize: 12, width: 92, textAlign: "right" },
  budgetCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  budgetRemaining: { color: colors.foreground, fontSize: 22, fontWeight: "900", paddingHorizontal: 0 },
  budgetTotal: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
  subtitle: { color: colors.mutedForeground, fontSize: 11 },
  right: { alignItems: "flex-end" },
  budgetProgress: { gap: 6 },
  budgetProgressHeader: { flexDirection: "row", justifyContent: "space-between" },
  budgetProgressText: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700" },
  categoryRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, justifyContent: "space-between", gap: 12 },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  categoryLabel: { color: colors.foreground, fontSize: 13 },
  categoryAmount: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 12 },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textAlign: "center", paddingVertical: 8 }
});
