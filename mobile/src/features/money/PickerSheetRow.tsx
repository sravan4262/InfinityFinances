import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTheme } from "@/theme/ThemeProvider";

export function PickerSheetRow<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value)?.label ?? "Select";
  return (
    <View style={{gap:6}}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.pickerRow}>
        <Text style={styles.pickerLabel}>{selected}</Text>
        <Text style={styles.link}>Change</Text>
      </Pressable>
      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <Text style={styles.sheetTitle}>{label}</Text>
        <ScrollView style={{ maxHeight: 360 }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[styles.optionRow, active ? styles.optionRowActive : null]}
              >
                <Text style={active ? styles.optionTextActive : styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  fieldLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  link: { color: colors.primary, fontWeight: "900" },
  optionRow: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: "center", paddingHorizontal: 4 },
  optionRowActive: { backgroundColor: colors.primaryWash },
  optionText: { color: colors.foreground, fontWeight: "800" },
  optionTextActive: { color: colors.primary, fontWeight: "900" },
  pickerLabel: { color: colors.foreground, fontWeight: "800", flex: 1 },
  pickerRow: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" }
});
