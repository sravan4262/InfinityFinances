"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTrackerStore } from "@/lib/tracker/store";
import { trackerApi } from "@/lib/api/tracker";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
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

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const COLORS = [
  "oklch(0.68 0.15 195)", "oklch(0.70 0.18 200)", "oklch(0.76 0.155 75)",
  "oklch(0.65 0.20 150)", "oklch(0.60 0.14 205)",
];

export function SavingsLog() {
  const { categories, entries, upsertEntry, addCategory, removeCategory, setCategories, setEntries } =
    useTrackerStore();
  const [month, setMonth] = useState(currentMonth());
  const [addingCat, setAddingCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const isAuthed = useRef(false);

  // Check auth and load from API on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      isAuthed.current = true;

      try {
        const [cats, ents] = await Promise.all([
          trackerApi.getCategories(),
          trackerApi.getEntries(),
        ]);

        if (cats.length > 0) {
          setCategories(cats.map((c) => ({ id: c.id, label: c.label, color: c.color })));
        } else {
          // Seed default categories for new user
          const defaults = categories;
          const created = await Promise.all(
            defaults.map((cat) => trackerApi.createCategory(cat.label, cat.color))
          );
          setCategories(created.map((c) => ({ id: c.id, label: c.label, color: c.color })));
        }

        setEntries(
          ents.map((e) => ({
            month: e.month,
            categoryId: e.category_id,
            planned: e.planned ? parseFloat(e.planned) : 0,
            actual: e.actual ? parseFloat(e.actual) : 0,
          }))
        );
      } catch {
        // API unavailable — keep local store
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEntry = useCallback(
    (catId: string) =>
      entries.find((e) => e.month === month && e.categoryId === catId),
    [entries, month]
  );

  const handleChange = async (catId: string, field: "planned" | "actual", raw: string) => {
    const val = parseFloat(raw) || 0;
    const existing = getEntry(catId);
    const updated = {
      month,
      categoryId: catId,
      planned: field === "planned" ? val : existing?.planned ?? 0,
      actual: field === "actual" ? val : existing?.actual ?? 0,
    };
    upsertEntry(updated);
    if (isAuthed.current) {
      trackerApi.upsertEntries([updated]).catch(() => {});
    }
  };

  const totals = categories.reduce(
    (acc, cat) => {
      const e = getEntry(cat.id);
      acc.planned += e?.planned ?? 0;
      acc.actual += e?.actual ?? 0;
      return acc;
    },
    { planned: 0, actual: 0 }
  );

  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) return;
    const color = COLORS[categories.length % COLORS.length];
    const label = newCatLabel.trim();
    setNewCatLabel("");
    setAddingCat(false);

    if (isAuthed.current) {
      try {
        const created = await trackerApi.createCategory(label, color);
        addCategory({ id: created.id, label: created.label, color: created.color });
      } catch {
        addCategory({ id: `custom_${Date.now()}`, label, color });
      }
    } else {
      addCategory({ id: `custom_${Date.now()}`, label, color });
    }
  };

  const handleRemoveCategory = async (id: string) => {
    removeCategory(id);
    if (isAuthed.current) {
      trackerApi.deleteCategory(id).catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth(prevMonth(month))}
          className="p-3 rounded-lg hover:bg-muted/30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold">{monthLabel(month)}</h2>
        <button
          onClick={() => setMonth(nextMonth(month))}
          className="p-3 rounded-lg hover:bg-muted/30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_90px_90px_56px] sm:grid-cols-[1fr_140px_140px_80px] text-xs text-muted-foreground px-4 py-2.5 border-b border-border/30">
          <span>Category</span>
          <span className="text-right">Planned (₹/$)</span>
          <span className="text-right">Actual (₹/$)</span>
          <span className="text-right">±</span>
        </div>

        {/* Rows */}
        {categories.map((cat, i) => {
          const entry = getEntry(cat.id);
          const planned = entry?.planned ?? 0;
          const actual = entry?.actual ?? 0;
          const dev = actual - planned;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_90px_90px_56px] sm:grid-cols-[1fr_140px_140px_80px] items-center px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/10 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="text-sm truncate">{cat.label}</span>
                <button
                  onClick={() => handleRemoveCategory(cat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground/50 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-end">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={planned || ""}
                  placeholder="0"
                  onChange={(e) => handleChange(cat.id, "planned", e.target.value)}
                  className="w-16 sm:w-28 text-right bg-transparent border border-border/30 rounded-md px-1 sm:px-2 py-1 text-xs focus:outline-none focus:border-primary/60 tabular-nums"
                />
              </div>
              <div className="flex justify-end">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={actual || ""}
                  placeholder="0"
                  onChange={(e) => handleChange(cat.id, "actual", e.target.value)}
                  className="w-16 sm:w-28 text-right bg-transparent border border-border/30 rounded-md px-1 sm:px-2 py-1 text-xs focus:outline-none focus:border-primary/60 tabular-nums"
                />
              </div>
              <div className="text-right tabular-nums text-xs font-medium">
                {dev === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={dev > 0 ? "text-success" : "text-destructive"}>
                    {dev > 0 ? "+" : ""}{formatCurrency(dev, true)}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Totals */}
        <div className="grid grid-cols-[1fr_90px_90px_56px] sm:grid-cols-[1fr_140px_140px_80px] items-center px-4 py-3 bg-muted/10 border-t border-border/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Total
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.planned, true)}
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.actual, true)}
          </span>
          <div className="text-right text-xs font-semibold tabular-nums">
            {totals.actual - totals.planned === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span
                className={
                  totals.actual >= totals.planned ? "text-success" : "text-destructive"
                }
              >
                {totals.actual >= totals.planned ? "+" : ""}
                {formatCurrency(totals.actual - totals.planned, true)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Savings rate bar */}
      {totals.planned > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Actual vs planned</span>
            <span className="font-medium text-foreground tabular-nums">
              {Math.round((totals.actual / totals.planned) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totals.actual / totals.planned) * 100)}%`,
                background:
                  totals.actual >= totals.planned
                    ? "oklch(0.65 0.18 150)"
                    : "oklch(0.68 0.15 195)",
              }}
            />
          </div>
        </div>
      )}

      {/* Add category */}
      <div className="pt-1">
        {addingCat ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") setAddingCat(false);
              }}
              placeholder="Category name…"
              className="flex-1 bg-transparent border border-border/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={handleAddCategory}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAddingCat(false); setNewCatLabel(""); }}
              className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add category
          </button>
        )}
      </div>
    </div>
  );
}
