import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { CalendarDays, CalendarRange, ListOrdered, MoreHorizontal, PieChart, StickyNote, Target, Wallet } from "lucide-react-native";
import { TopBar } from "@/components/layout/TopBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FAB } from "@/components/ui/FAB";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { Screen } from "@/components/ui/Screen";
import { StatCard } from "@/components/ui/StatCard";
import { useUser } from "@/features/auth/useUser";
import { useChatContextStore } from "@/lib/chatContextStore";
import { success, warning } from "@/lib/haptics";
import { useMoneyStore } from "@/lib/money/store";
import type { Transaction } from "@/lib/money/types";
import {
  expenseByCategory,
  monthLabel,
  noteCounts,
  totalsByKind,
  txInMonth
} from "@/lib/money/selectors";
import { todayYmd } from "@/lib/money/recurrence";
import { toCsv } from "@/lib/money/csv";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { AddTransactionSheet, defaultTransactionForm, type TxForm } from "./AddTransactionSheet";
import { ManageAccountsSheet } from "./ManageAccountsSheet";
import { ManageCategoriesSheet } from "./ManageCategoriesSheet";
import { BudgetView } from "./views/BudgetView";
import { CalendarView } from "./views/CalendarView";
import { DailyView } from "./views/DailyView";
import { MonthlyView } from "./views/MonthlyView";
import { NotesView } from "./views/NotesView";
import { StatsView } from "./views/StatsView";
import { SummaryView } from "./views/SummaryView";

type Tab = "daily" | "calendar" | "monthly" | "summary" | "stats" | "budget" | "notes";

export function MoneyScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const store = useMoneyStore();
  const [tab, setTab] = useState<Tab>("daily");
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manageSheet, setManageSheet] = useState<"menu" | "categories" | "accounts" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TxForm>(() => defaultTransactionForm(store, "expense"));
  const monthTx = txInMonth(store.transactions, month);
  const dailyTx = selectedDate ? monthTx.filter((transaction) => transaction.date === selectedDate) : monthTx;
  const totals = totalsByKind(monthTx);
  const breakdown = expenseByCategory(monthTx, store.categories);
  const notes = noteCounts(monthTx.filter((tx) => tx.kind === "expense"));
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);

  useEffect(() => {
    store.materializeRecurring();
  }, [store.materializeRecurring]);

  useEffect(() => {
    if (user) store.initSync(user.id);
    else store.disconnectSync();
  }, [user, store.initSync, store.disconnectSync]);

  useEffect(() => {
    setChatContext("budget", {
      month,
      monthSummary: totals as unknown as Record<string, unknown>,
      categories: store.categories.map((category) => ({ label: category.label, kind: category.kind })),
      accounts: store.accounts.map((account) => ({ name: account.name, type: account.type }))
    });
    return () => clearChatContext("budget");
  }, [month, totals, store.categories, store.accounts, setChatContext, clearChatContext]);

  const budgetRows = store.categories.filter((category) => category.kind === "expense").map((category) => {
    const amount = store.budgets.find((budget) => budget.month === month && budget.categoryId === category.id)?.amount ?? 0;
    const spent = breakdown.find((item) => item.category.id === category.id)?.amount ?? 0;
    return { category, amount, spent, remaining: amount - spent };
  });
  const budgetTotal = budgetRows.reduce((sum, row) => sum + row.amount, 0);
  const spentTotal = budgetRows.reduce((sum, row) => sum + row.spent, 0);
  const netTotal = totals.income - totals.expense;
  const moneyTabs: { label: string; value: Tab; icon: typeof ListOrdered }[] = [
    { label: "Daily", value: "daily", icon: ListOrdered },
    { label: "Calendar", value: "calendar", icon: CalendarDays },
    { label: "Monthly", value: "monthly", icon: CalendarRange },
    { label: "Summary", value: "summary", icon: Wallet },
    { label: "Stats", value: "stats", icon: PieChart },
    { label: "Budget", value: "budget", icon: Target },
    { label: "Notes", value: "notes", icon: StickyNote }
  ];

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultTransactionForm(store, "expense"), date: selectedDate ?? todayYmd() });
    setSheetOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setForm({
      date: transaction.date,
      kind: transaction.kind,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      note: transaction.note ?? "",
      description: transaction.description ?? "",
      recurring: Boolean(transaction.recurrenceId),
      frequency: "monthly",
      interval: 1,
      endDate: ""
    });
    setSheetOpen(true);
  };

  const saveTransaction = () => {
    if (form.amount <= 0) return;
    const payload = {
      date: form.date || todayYmd(),
      kind: form.kind,
      amount: form.amount,
      categoryId: form.categoryId,
      accountId: form.accountId,
      note: form.note.trim() || undefined,
      description: form.description.trim() || undefined
    };
    if (editing) store.updateTransaction(editing.id, payload);
    else if (form.recurring) store.addRecurrenceRule({ ...payload, startDate: payload.date, frequency: form.frequency, interval: form.interval, endDate: form.endDate || undefined });
    else store.addTransaction(payload);
    success();
    setSheetOpen(false);
  };

  const remove = (transaction: Transaction) => {
    Alert.alert("Delete transaction?", transaction.description || transaction.note || formatCurrency(transaction.amount), [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => { warning(); store.deleteTransaction(transaction.id); } }
    ]);
  };
  const exportCsv = async () => {
    const csv = toCsv(monthTx, store.categories, store.accounts);
    await Share.share({ message: csv, title: `Infinity Finances ${month} transactions.csv` });
  };

  const bottomBarTotalHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  const bottomBar = (
    <View style={styles.bottomBarWrap} pointerEvents="box-none">
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomBarContent}>
          {moneyTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.value;
            return (
              <Pressable key={item.value} onPress={() => setTab(item.value)} style={styles.bottomTab} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <Icon size={20} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={active ? styles.bottomTabTextActive : styles.bottomTabText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Screen floating={<>
      <FAB accessibilityLabel={user ? "Add transaction" : "Sign in to add transactions"} onPress={user ? openNew : () => router.push("/auth/login")} bottomOffset={BOTTOM_BAR_HEIGHT} />
      {bottomBar}
    </>}>
      <TopBar />
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>Budget</Text>
            <Text style={styles.subtitle}>{user ? `Synced${store.syncing ? " · syncing" : ""}` : "Local mode · sign in to sync with web"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Budget options" onPress={() => setManageSheet("menu")} style={styles.iconButton}>
            <MoreHorizontal size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
      <MonthSwitcher
        label={monthLabel(month)}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        showTodayLink={month !== currentMonth()}
        onToday={() => setMonth(currentMonth())}
      />
      <View style={styles.totalsRow}>
        <StatCard label="Income" value={formatCurrency(totals.income, true)} highlight/>
        <StatCard label="Expense" value={formatCurrency(totals.expense, true)} />
        <StatCard label="Net" value={formatCurrency(netTotal, true)} sub={netTotal >= 0 ? "positive" : "negative"} highlight={netTotal >= 0}/>
      </View>

      {tab === "daily" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><DailyView label={selectedDate ?? month} transactions={dailyTx} selectedDate={selectedDate} onShowMonth={() => setSelectedDate(null)} onEdit={openEdit} onRemove={remove} /></Animated.View> : null}

      {tab === "calendar" ? <Animated.View entering={FadeIn.duration(180)} style={styles.calendar}><CalendarView month={month} transactions={store.transactions} onSelectDate={(ymd) => { setSelectedDate(ymd); setMonth(ymd.slice(0,7)); setTab("daily"); }} /></Animated.View> : null}

      {tab === "monthly" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><MonthlyView month={month} transactions={store.transactions} onSelectMonth={setMonth} /></Animated.View> : null}

      {tab === "summary" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><SummaryView transactions={monthTx} accounts={store.accounts} categories={store.categories} budgetTotal={budgetTotal} spentTotal={spentTotal} /></Animated.View> : null}

      {tab === "stats" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><StatsView expenseTotal={totals.expense} breakdown={breakdown} /></Animated.View> : null}

      {tab === "budget" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><BudgetView rows={budgetRows} budgetTotal={budgetTotal} spentTotal={spentTotal} onSetBudget={(categoryId, amount) => store.setBudget(month, categoryId, amount)} /></Animated.View> : null}

      {tab === "notes" ? <Animated.View entering={FadeIn.duration(180)} style={styles.content}><NotesView notes={notes} /></Animated.View> : null}

      <View style={{ height: bottomBarTotalHeight + 24 }} />

      <AddTransactionSheet open={sheetOpen} editing={editing} form={form} setForm={setForm} onClose={() => setSheetOpen(false)} onSave={saveTransaction} />
      <BottomSheet open={manageSheet === "menu"} onClose={() => setManageSheet(null)}>
        <Text style={styles.sheetTitle}>Budget options</Text>
        <Pressable onPress={() => setManageSheet("categories")} style={styles.optionRow}><Text style={styles.optionText}>Manage categories</Text></Pressable>
        <Pressable onPress={() => setManageSheet("accounts")} style={styles.optionRow}><Text style={styles.optionText}>Manage accounts</Text></Pressable>
        <Pressable onPress={() => { setManageSheet(null); exportCsv(); }} style={styles.optionRow}><Text style={styles.optionText}>Export CSV</Text></Pressable>
      </BottomSheet>
      <ManageCategoriesSheet open={manageSheet === "categories"} onClose={() => setManageSheet(null)} />
      <ManageAccountsSheet open={manageSheet === "accounts"} onClose={() => setManageSheet(null)} />
    </Screen>
  );
}

const BOTTOM_BAR_HEIGHT = 64;

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  header: { gap: 4, marginBottom: 12 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: "row", gap: 12, marginVertical: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  totalsRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  bottomBarWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottomBar: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 },
  bottomBarContent: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 10 },
  bottomTab: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 4, gap: 4, minWidth: 64 },
  bottomTabText: { color: colors.mutedForeground, fontSize: 10, fontWeight: "800" },
  bottomTabTextActive: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  content: { gap: 12, marginTop: 16 },
  calendar: { flexDirection: "row", flexWrap: "wrap", marginTop: 16 },
  listRow: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listLabel: { color: colors.mutedForeground, fontWeight: "700" },
  listValue: { color: colors.foreground, fontWeight: "900" },
  link: { color: colors.primary, fontWeight: "900" },
  budgetRow: { gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  compactBudgetRow: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  budgetRemaining: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  summaryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 10 },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  optionRow: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: "center", paddingHorizontal: 4 },
  optionText: { color: colors.foreground, fontWeight: "800" }
});
