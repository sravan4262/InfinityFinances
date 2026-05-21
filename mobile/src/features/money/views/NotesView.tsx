import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowDown01, ArrowDown10, ArrowDownAZ } from "lucide-react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

type Sort = "count-desc" | "amount-desc" | "name-asc";

const PREVIEW_ROWS = 5;

export function NotesView({ notes }: { notes: { note: string; count: number; amount: number }[] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [sort, setSort] = useState<Sort>("count-desc");
  const [fullscreen, setFullscreen] = useState(false);
  const sorted = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (sort === "count-desc") return b.count - a.count || b.amount - a.amount;
      if (sort === "amount-desc") return b.amount - a.amount;
      return a.note.localeCompare(b.note);
    });
  }, [notes, sort]);

  if (!sorted.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>No notes yet. Add transactions with notes to group them here.</Text>
      </View>
    );
  }

  const cycleSort = () => setSort((current) => (current === "count-desc" ? "amount-desc" : current === "amount-desc" ? "name-asc" : "count-desc"));
  const SortIcon = sort === "count-desc" ? ArrowDown10 : sort === "amount-desc" ? ArrowDown01 : ArrowDownAZ;
  const truncated = sorted.length > PREVIEW_ROWS;
  const previewNotes = truncated ? sorted.slice(0, PREVIEW_ROWS) : sorted;

  const renderTable = (data: typeof sorted) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.noteCol]}>Note</Text>
        <Pressable onPress={cycleSort} style={styles.sortButton} hitSlop={6}>
          <SortIcon size={14} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerCell, styles.amountCol]}>Amount</Text>
      </View>
      {data.map((item) => (
        <View key={item.note} style={styles.row}>
          <Text style={[styles.note, styles.noteCol]} numberOfLines={1}>{item.note}</Text>
          <Text style={[styles.count, styles.countCol]}>{item.count}</Text>
          <Text style={[styles.amount, styles.amountCol]}>{formatCurrency(item.amount)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.content}>
      {truncated ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <ExpandButton onPress={() => setFullscreen(true)} />
        </View>
      ) : null}
      {renderTable(previewNotes)}
      {truncated ? <Text style={styles.truncatedHint}>Showing {PREVIEW_ROWS} of {sorted.length} · tap Expand for all</Text> : null}
      <FullscreenModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Notes"
        subtitle={`${sorted.length} grouped notes`}
      >
        {renderTable(sorted)}
      </FullscreenModal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  emptyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 28, alignItems: "center" },
  empty: { color: colors.mutedForeground, fontSize: 13, textAlign: "center" },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.cardElevated, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  headerCell: { color: colors.mutedForeground, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  sortButton: { width: 50, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  noteCol: { flex: 1 },
  countCol: { width: 50, textAlign: "center" },
  amountCol: { width: 100, textAlign: "right" },
  note: { color: colors.foreground, fontSize: 13 },
  count: { color: colors.mutedForeground, fontSize: 11 },
  amount: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  content: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textAlign: "center" }
});
