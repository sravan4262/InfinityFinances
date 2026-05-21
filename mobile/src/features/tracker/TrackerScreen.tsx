import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { TopBar } from "@/components/layout/TopBar";
import { AreaChart, MultiLineChart, ProgressBar } from "@/components/ui/Sparkline";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { NumberField } from "@/components/ui/NumberField";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { TextField } from "@/components/ui/TextField";
import { useUser } from "@/features/auth/useUser";
import { currentMonthStr } from "@/lib/store";
import { useTrackerStore } from "@/lib/tracker/store";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

type Tab = "log" | "trending";

export function TrackerScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("log");
  const [month, setMonth] = useState(currentMonthStr());
  const [name, setName] = useState("");
  const { categories, entries, upsertEntry, addCategory, removeCategory, initSync, disconnectSync, syncing } = useTrackerStore();

  useEffect(() => {
    if (user) initSync(user.id);
    else disconnectSync();
  }, [user, initSync, disconnectSync]);

  const rows = categories.map((category) => ({ category, entry: entries.find((entry) => entry.month === month && entry.categoryId === category.id) }));
  const totals = rows.reduce((acc, row) => ({ planned: acc.planned + (row.entry?.planned ?? 0), actual: acc.actual + (row.entry?.actual ?? 0) }), { planned: 0, actual: 0 });
  const trend = useMemo(() => {
    const months = [...new Set(entries.map((entry) => entry.month))].sort();
    return months.map((item) => {
      const monthEntries = entries.filter((entry) => entry.month === item);
      return {
        month: item,
        planned: monthEntries.reduce((sum, entry) => sum + entry.planned, 0),
        actual: monthEntries.reduce((sum, entry) => sum + entry.actual, 0)
      };
    });
  }, [entries]);
  const averageActual = trend.length ? trend.reduce((sum, item) => sum + item.actual, 0) / trend.length : 0;
  const best = trend.reduce<typeof trend[number] | null>((winner, item) => !winner || item.actual > winner.actual ? item : winner, null);
  const variance = totals.actual - totals.planned;

  return (
    <Screen>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.title}>Tracker</Text>
        <Text style={styles.subtitle}>Planned versus actual savings{user ? syncing ? " · syncing" : " · synced" : " · local mode"}.</Text>
      </View>
      <MonthSwitcher label={month} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />
      <SegmentedControl value={tab} options={[{label:"Monthly log",value:"log"},{label:"Trending",value:"trending"}]} onChange={setTab} />

      {tab === "log" ? (
        <View style={styles.content}>
          <View style={styles.row}><StatCard label="Planned" value={formatCurrency(totals.planned)} /><StatCard label="Actual" value={formatCurrency(totals.actual)} highlight /></View>
          <View style={variance >= 0 ? styles.goodCallout : styles.badCallout}><Text style={styles.calloutTitle}>{variance >= 0 ? "Ahead by " : "Behind by "}{formatCurrency(Math.abs(variance))}</Text><ProgressBar value={totals.actual} max={Math.max(totals.planned, totals.actual, 1)} color={variance >= 0 ? colors.success : colors.warning} /></View>
          {rows.map(({ category, entry }) => (
            <View key={category.id} style={styles.categoryBlock}>
              <View style={styles.rowBetween}>
                <View style={styles.categoryTitle}><View style={[styles.dot,{backgroundColor:category.color}]} /><Text style={styles.listValue}>{category.label}</Text></View>
                <Pressable onPress={() => removeCategory(category.id)}><Text style={styles.delete}>Remove</Text></Pressable>
              </View>
              <View style={styles.row}>
                <View style={{flex:1}}><NumberField label="Planned" value={entry?.planned ?? 0} onChange={(planned) => upsertEntry({ month, categoryId: category.id, planned, actual: entry?.actual ?? 0 })} prefix="$" format="currency" /></View>
                <View style={{flex:1}}><NumberField label="Actual" value={entry?.actual ?? 0} onChange={(actual) => upsertEntry({ month, categoryId: category.id, planned: entry?.planned ?? 0, actual })} prefix="$" format="currency" /></View>
              </View>
              <ProgressBar value={entry?.actual ?? 0} max={Math.max(entry?.planned ?? 0, entry?.actual ?? 0, 1)} color={category.color} />
            </View>
          ))}
          <View style={styles.addBox}>
            <TextField label="New category" value={name} onChange={setName} />
            <Pressable onPress={() => { if (name.trim()) { addCategory({ id: `cat-${Date.now()}`, label: name.trim(), color: colors.chart5 }); setName(""); } }} style={styles.addButton}><Plus size={15} color={colors.primary}/><Text style={styles.link}>Add category</Text></Pressable>
          </View>
        </View>
      ) : null}

      {tab === "trending" ? (
        <View style={styles.content}>
          {trend.length === 0 ? <Text style={styles.subtitle}>Log a month to see trends.</Text> : (
            <>
              <View style={styles.row}><StatCard label="Avg actual" value={formatCurrency(averageActual)} highlight/><StatCard label="Best month" value={best?.month ?? "-"} sub={best ? formatCurrency(best.actual) : undefined}/></View>
              <MultiLineChart series={[{values:trend.map((item) => item.planned),color:colors.mutedForeground,width:2},{values:trend.map((item) => item.actual),color:colors.primary,width:3}]} height={170} />
              <AreaChart values={trend.map((item) => item.actual - item.planned)} color={colors.chart3} height={110} />
              {trend.map((item) => {
                const delta = item.actual - item.planned;
                return <View key={item.month} style={styles.listRow}><Text style={styles.listLabel}>{item.month}</Text><Text style={[styles.listValue,{color:delta>=0?colors.success:colors.warning}]}>{formatCurrency(item.actual)} ({delta>=0?"+":""}{formatCurrency(delta,true)})</Text></View>;
              })}
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  header: { gap: 4, marginBottom: 12 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  content: { gap: 12, marginTop: 16 },
  row: { flexDirection: "row", gap: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  goodCallout: { borderRadius: 12, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successWash, padding: 14, gap: 10 },
  badCallout: { borderRadius: 12, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warningWash, padding: 14, gap: 10 },
  calloutTitle: { color: colors.foreground, fontWeight: "900" },
  categoryBlock: { gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryTitle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  delete: { color: colors.destructive, fontWeight: "800" },
  addBox: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 10 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { color: colors.primary, fontWeight: "900" },
  listRow: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listLabel: { color: colors.mutedForeground, fontWeight: "700" },
  listValue: { color: colors.foreground, fontWeight: "900" }
});
