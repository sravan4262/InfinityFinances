"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ListOrdered,
  CalendarDays,
  CalendarRange,
  PieChart,
  Wallet,
  Target,
  StickyNote,
} from "lucide-react";
import { useMoneyStore } from "@/lib/money/store";
import { useUser } from "@/lib/hooks/useUser";
import { monthLabel, txInMonth, totalsByKind } from "@/lib/money/selectors";
import { formatCurrency } from "@/lib/utils";
import { DailyView } from "./views/DailyView";
import { CalendarView } from "./views/CalendarView";
import { MonthlyView } from "./views/MonthlyView";
import { SummaryView } from "./views/SummaryView";
import { StatsView } from "./views/StatsView";
import { BudgetView } from "./views/BudgetView";
import { NotesView } from "./views/NotesView";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { useChatContextStore } from "@/lib/chatContextStore";

type ViewTab = "daily" | "calendar" | "monthly" | "summary" | "stats" | "budget" | "notes";

const VIEWS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
  { id: "daily", label: "Daily", icon: ListOrdered },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "monthly", label: "Monthly", icon: CalendarRange },
  { id: "summary", label: "Summary", icon: Wallet },
  { id: "stats", label: "Stats", icon: PieChart },
  { id: "budget", label: "Budget", icon: Target },
  { id: "notes", label: "Notes", icon: StickyNote },
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MoneyPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState<ViewTab>("daily");
  const [addOpen, setAddOpen] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const transactions = useMoneyStore((s) => s.transactions);
  const materializeRecurring = useMoneyStore((s) => s.materializeRecurring);
  const initSync = useMoneyStore((s) => s.initSync);
  const disconnectSync = useMoneyStore((s) => s.disconnectSync);
  const syncUserId = useMoneyStore((s) => s.syncUserId);
  const { user } = useUser();

  useEffect(() => {
    materializeRecurring();
  }, [materializeRecurring]);

  useEffect(() => {
    if (user?.id && syncUserId !== user.id) {
      initSync(user.id);
    } else if (user === null && syncUserId) {
      disconnectSync();
    }
  }, [user, syncUserId, initSync, disconnectSync]);

  const monthTxs = useMemo(() => txInMonth(transactions, month), [transactions, month]);
  const totals = useMemo(() => totalsByKind(monthTxs), [monthTxs]);

  // Publish budget context for the global ChatLauncher.
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);
  const categories = useMoneyStore((s) => s.categories);
  const accounts = useMoneyStore((s) => s.accounts);
  useEffect(() => {
    setChatContext("budget", {
      month,
      monthSummary: totals as unknown as Record<string, unknown>,
      categories: categories.map((c) => ({ label: c.label, kind: c.kind })),
      accounts: accounts.map((a) => ({ name: a.name, type: a.type })),
    });
    return () => clearChatContext("budget");
  }, [month, totals, categories, accounts, setChatContext, clearChatContext]);

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Month switcher */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(prevMonth(month))}
          className="p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{monthLabel(month)}</h2>
          {month !== currentMonth() && (
            <button
              onClick={() => setMonth(currentMonth())}
              className="text-[11px] text-primary hover:underline"
            >
              today
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/30 border border-border/30 overflow-x-auto max-w-full">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {view === id && (
                <motion.div
                  layoutId="money-view-pill"
                  className="absolute inset-0 rounded-lg bg-primary/25 border border-primary/35"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                  view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <div className="glass rounded-xl px-3 sm:px-4 py-2.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Income</div>
          <div className="text-base sm:text-lg font-semibold tabular-nums text-success">
            {formatCurrency(totals.income)}
          </div>
        </div>
        <div className="glass rounded-xl px-3 sm:px-4 py-2.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expense</div>
          <div className="text-base sm:text-lg font-semibold tabular-nums text-destructive">
            {formatCurrency(totals.expense)}
          </div>
        </div>
        <div className="glass rounded-xl px-3 sm:px-4 py-2.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</div>
          <div
            className={`text-base sm:text-lg font-semibold tabular-nums ${
              totals.income - totals.expense >= 0 ? "text-foreground" : "text-destructive"
            }`}
          >
            {formatCurrency(totals.income - totals.expense)}
          </div>
        </div>
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {view === "daily" && (
            <DailyView month={month} onEdit={(id) => { setEditTxId(id); setAddOpen(true); }} />
          )}
          {view === "calendar" && (
            <CalendarView month={month} onSelectDay={() => setView("daily")} />
          )}
          {view === "monthly" && (
            <MonthlyView month={month} onSelectMonth={(m) => { setMonth(m); setView("daily"); }} />
          )}
          {view === "summary" && <SummaryView month={month} />}
          {view === "stats" && <StatsView month={month} />}
          {view === "budget" && <BudgetView month={month} />}
          {view === "notes" && <NotesView month={month} />}
        </motion.div>
      </AnimatePresence>

      {/* FAB */}
      {user ? (
        <button
          onClick={() => { setEditTxId(null); setAddOpen(true); }}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6" />
        </button>
      ) : (
        <button
          onClick={() => router.push("/auth/login")}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2 h-12 px-4 rounded-full bg-muted text-muted-foreground border border-border shadow hover:bg-muted/70 transition-colors"
          aria-label="Sign in to add transactions"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-medium">Sign in to add</span>
        </button>
      )}

      <AddTransactionSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditTxId(null); }}
        editId={editTxId}
        defaultMonth={month}
      />
    </div>
  );
}
