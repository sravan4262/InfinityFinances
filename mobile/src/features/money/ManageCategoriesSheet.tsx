import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextField } from "@/components/ui/TextField";
import { useMoneyStore } from "@/lib/money/store";
import type { TxKind } from "@/lib/money/types";
import { useTheme } from "@/theme/ThemeProvider";
import { PickerSheetRow } from "./PickerSheetRow";

export function ManageCategoriesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const store = useMoneyStore();
  const [draft, setDraft] = useState({ label: "", kind: "expense" as TxKind, color: colors.primary });

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text style={styles.sheetTitle}>Manage categories</Text>
      <ScrollView style={{ maxHeight: 280 }}>
        {store.categories.map((category) => (
          <View key={category.id} style={styles.manageRow}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{category.label}</Text>
              <Text style={styles.subtitle}>{category.kind}</Text>
            </View>
            <Pressable onPress={() => store.removeCategory(category.id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.summaryCard}>
        <TextField label="Category name" value={draft.label} onChange={(label) => setDraft((current) => ({ ...current, label }))} />
        <PickerSheetRow label="Kind" value={draft.kind} options={[{ label: "Expense", value: "expense" }, { label: "Income", value: "income" }]} onChange={(kind) => setDraft((current) => ({ ...current, kind }))} />
        <AppButton
          label="Add category"
          onPress={() => {
            const label = draft.label.trim();
            if (!label) return;
            store.addCategory({ label, kind: draft.kind, color: draft.color });
            setDraft({ label: "", kind: "expense", color: colors.primary });
          }}
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  deleteText: { color: colors.destructive, fontWeight: "900", fontSize: 12 },
  manageRow: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  summaryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 10 },
  txTitle: { color: colors.foreground, fontWeight: "800" }
});
