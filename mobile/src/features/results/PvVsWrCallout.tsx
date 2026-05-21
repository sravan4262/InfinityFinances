import { StyleSheet, Text, View } from "react-native";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, FireInputs, FireResults } from "@/lib/engine/types";

export function PvVsWrCallout({
  results,
  inputs,
  currency
}: {
  results: FireResults;
  inputs: FireInputs;
  currency: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!results.fireNumber) return null;
  const diff = Math.abs(results.requiredCorpusPV - results.fireNumber) / results.fireNumber;
  if (diff <= 0.05) return null;
  const monthly = inputs.monthlyRetirementSalary ?? inputs.retirementSpending / 12;
  const years = inputs.lifeExpectancy - inputs.retirementAge;
  const pvIsLower = results.requiredCorpusPV < results.fireNumber;
  return (
    <View style={styles.callout}>
      <Text style={styles.title}>Withdrawal-rate vs PV corpus</Text>
      <Text style={styles.body}>
        The {(inputs.withdrawalRate * 100).toFixed(1)}% rule gives{" "}
        <Text style={styles.bold}>{formatCurrency(results.fireNumber, true, currency)}</Text>. The PV formula — funding{" "}
        <Text style={styles.bold}>{formatCurrency(monthly, true, currency)}/mo</Text> for {years} years — gives{" "}
        <Text style={styles.bold}>{formatCurrency(results.requiredCorpusPV, true, currency)}</Text>.{" "}
        {pvIsLower
          ? "PV says you need less; the withdrawal-rate target is more conservative."
          : "PV says you need more; a lower real return demands a larger corpus."}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  callout: { borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryWash, padding: 14, gap: 6 },
  title: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  body: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  bold: { color: colors.foreground, fontWeight: "900" }
});
