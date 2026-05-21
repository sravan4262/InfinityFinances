import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { WizardStep } from "@/lib/store";
import { useTheme } from "@/theme/ThemeProvider";

const STEPS = ["You", "Income", "Portfolio", "Advanced", "Goals"] as const;

export function StepStrip({
  wizardStep,
  highestUnlockedStep,
  onJump
}: {
  wizardStep: WizardStep;
  highestUnlockedStep: WizardStep;
  onJump: (step: WizardStep) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
      {STEPS.map((label,index) => {
        const step = index as WizardStep;
        const done = index < wizardStep && index <= highestUnlockedStep;
        const active = index === wizardStep;
        const disabled = step > highestUnlockedStep;
        return (
          <Pressable key={label} disabled={disabled} onPress={() => onJump(step)} style={[styles.step, active ? styles.stepActive : null, disabled ? styles.stepDisabled : null]}>
            <View style={[styles.dot, active ? styles.dotActive : done ? styles.dotDone : disabled ? styles.dotPending : null]}><Text style={[styles.dotText, active ? styles.dotTextActive : done ? styles.dotTextDone : null]}>{done ? "✓" : index + 1}</Text></View>
            <Text style={[styles.stepLabel, active ? styles.stepLabelActive : disabled ? styles.stepLabelDisabled : null]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryWash, borderColor: colors.primary },
  dotPending: { borderColor: colors.border },
  dotText: { color: colors.mutedForeground, fontWeight: "900" },
  dotTextActive: { color: colors.primaryForeground },
  dotTextDone: { color: colors.primary },
  step: { minWidth: 92, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", justifyContent: "center", gap: 5 },
  stepActive: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  stepDisabled: { opacity: 0.45 },
  stepLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700" },
  stepLabelActive: { color: colors.foreground },
  stepLabelDisabled: { color: colors.mutedForeground },
  steps: { flexDirection: "row", gap: 8, paddingBottom: 14 }
});
