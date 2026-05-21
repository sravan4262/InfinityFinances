import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextField } from "@/components/ui/TextField";
import { useMoneyStore } from "@/lib/money/store";
import type { AccountType } from "@/lib/money/types";
import { useTheme } from "@/theme/ThemeProvider";
import { PickerSheetRow } from "./PickerSheetRow";

export function ManageAccountsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const store = useMoneyStore();
  const [draft, setDraft] = useState({ name: "", type: "cash" as AccountType });

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text style={styles.sheetTitle}>Manage accounts</Text>
      <ScrollView style={{ maxHeight: 280 }}>
        {store.accounts.map((account) => (
          <View key={account.id} style={styles.manageRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{account.name}</Text>
              <Text style={styles.subtitle}>{account.type}</Text>
            </View>
            <Pressable onPress={() => store.removeAccount(account.id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.summaryCard}>
        <TextField label="Account name" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} />
        <PickerSheetRow label="Type" value={draft.type} options={[{ label: "Cash", value: "cash" }, { label: "Card", value: "card" }, { label: "Bank", value: "bank" }]} onChange={(type) => setDraft((current) => ({ ...current, type }))} />
        <AppButton
          label="Add account"
          onPress={() => {
            const name = draft.name.trim();
            if (!name) return;
            store.addAccount({ name, type: draft.type });
            setDraft({ name: "", type: "cash" });
          }}
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  deleteText: { color: colors.destructive, fontWeight: "900", fontSize: 12 },
  manageRow: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  summaryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 10 },
  txTitle: { color: colors.foreground, fontWeight: "800" }
});
