import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTheme } from "@/theme/ThemeProvider";

export type Person = "you" | "spouse";

export function StepHeader({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: colors.foreground, fontSize: 21, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>{body}</Text>
    </View>
  );
}

export function PersonToggle({ value, onChange }: { value: Person; onChange: (value: Person) => void }) {
  return (
    <SegmentedControl
      value={value}
      options={[{ label: "You", value: "you" }, { label: "Spouse", value: "spouse" }]}
      onChange={onChange}
    />
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
      <Plus size={15} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function RemoveButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 36, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
      <Trash2 size={14} color={colors.destructive} />
      <Text style={{ color: colors.destructive, fontWeight: "800" }}>Remove</Text>
    </Pressable>
  );
}

export const makeStepStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  hero: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryWash, borderRadius: 14, padding: 14, gap: 5 },
  eyebrow: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  heroNumber: { color: colors.primary, fontSize: 28, fontWeight: "900" },
  helper: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  itemCard: { gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated, padding: 12 },
  presetWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.foreground, fontSize: 12, fontWeight: "800" },
  pillTextActive: { color: colors.primaryForeground, fontSize: 12, fontWeight: "900" },
  secondaryButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.primary, fontWeight: "800" },
  removeText: { color: colors.destructive, fontWeight: "800", textAlign: "center" }
});
