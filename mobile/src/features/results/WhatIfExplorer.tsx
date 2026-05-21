import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RotateCcw, Zap } from "lucide-react-native";
import { SliderField } from "@/components/ui/SliderField";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, FireInputs, FireResults } from "@/lib/engine/types";

export function WhatIfExplorer({
  baseInputs,
  baseResults,
  onWhatIfChange
}: {
  baseInputs: FireInputs;
  baseResults: FireResults;
  onWhatIfChange: (results: FireResults | null) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const currency = baseInputs.currency ?? "USD";
  const baseMonthlyRetirementSalary = baseInputs.monthlyRetirementSalary ?? baseInputs.retirementSpending / 12;
  const baseMonthlySavings = Math.max(0, (baseInputs.afterTaxIncome - baseInputs.currentSpending) / 12);

  const [returnRate, setReturnRate] = useState(baseInputs.expectedReturn * 100);
  const [retirementAge, setRetirementAge] = useState(baseInputs.retirementAge);
  const [spending, setSpending] = useState(baseMonthlyRetirementSalary);
  const [savings, setSavings] = useState(baseMonthlySavings);

  useEffect(() => {
    setReturnRate(baseInputs.expectedReturn * 100);
    setRetirementAge(baseInputs.retirementAge);
    setSpending(baseMonthlyRetirementSalary);
    setSavings(baseMonthlySavings);
  }, [baseInputs, baseMonthlyRetirementSalary, baseMonthlySavings]);

  const isUnchanged =
    Math.abs(returnRate / 100 - baseInputs.expectedReturn) < 0.0005 &&
    retirementAge === baseInputs.retirementAge &&
    Math.abs(spending - baseMonthlyRetirementSalary) < 1 &&
    Math.abs(savings - baseMonthlySavings) < 1;

  const whatIfResults = useMemo<FireResults | null>(() => {
    if (isUnchanged) return null;
    const delta = returnRate / 100 - baseInputs.expectedReturn;
    const overridden: FireInputs = {
      ...baseInputs,
      expectedReturn: returnRate / 100,
      assets: baseInputs.assets.map((asset) => ({ ...asset, annualReturn: asset.annualReturn + delta })),
      monthlyRetirementSalary: spending,
      retirementSpending: spending * 12,
      afterTaxIncome: baseInputs.afterTaxIncome - baseMonthlySavings * 12 + savings * 12,
      currentSpending: baseInputs.currentSpending + baseMonthlySavings * 12 - savings * 12,
      retirementAge
    };
    return calculateFireMonthly(overridden);
  }, [returnRate, retirementAge, spending, savings, baseInputs, baseMonthlyRetirementSalary, baseMonthlySavings, isUnchanged]);

  useEffect(() => {
    onWhatIfChange(whatIfResults);
  }, [whatIfResults, onWhatIfChange]);

  const reset = () => {
    setReturnRate(baseInputs.expectedReturn * 100);
    setRetirementAge(baseInputs.retirementAge);
    setSpending(baseMonthlyRetirementSalary);
    setSavings(baseMonthlySavings);
  };

  const maxSavings = Math.max(Math.round(baseMonthlySavings * 3), 5000);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={16} color={colors.gold} />
          <View>
            <Text style={styles.title}>What-if explorer</Text>
            <Text style={styles.subtitle}>Drag a slider — see the impact on your plan</Text>
          </View>
        </View>
        {!isUnchanged ? (
          <Pressable onPress={reset} style={styles.resetButton} hitSlop={8}>
            <RotateCcw size={12} color={colors.mutedForeground} />
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      <SliderField
        label={`Expected return — base ${(baseInputs.expectedReturn * 100).toFixed(1)}%`}
        value={returnRate}
        display={`${returnRate.toFixed(1)}%`}
        min={1}
        max={15}
        step={0.5}
        onChange={setReturnRate}
      />
      <SliderField
        label={`Target retirement age — base ${baseInputs.retirementAge}`}
        value={retirementAge}
        display={`Age ${retirementAge}`}
        min={baseInputs.currentAge + 1}
        max={75}
        step={1}
        onChange={(value) => setRetirementAge(Math.round(value))}
      />
      <SliderField
        label={`Monthly retirement salary — base ${formatCurrency(baseMonthlyRetirementSalary, true, currency)}`}
        value={spending}
        display={`${formatCurrency(spending, true, currency)}/mo`}
        min={Math.round(baseMonthlyRetirementSalary * 0.4)}
        max={Math.round(baseMonthlyRetirementSalary * 2)}
        step={100}
        onChange={setSpending}
      />
      <SliderField
        label={`Monthly savings — base ${formatCurrency(baseMonthlySavings, true, currency)}`}
        value={savings}
        display={`${formatCurrency(savings, true, currency)}/mo`}
        min={0}
        max={maxSavings}
        step={100}
        onChange={setSavings}
      />
      {whatIfResults && !isUnchanged ? (
        <View style={styles.deltaBox}>
          <Text style={styles.deltaTitle}>Impact vs base</Text>
          <Delta label="FIRE number" base={baseResults.fireNumber} override={whatIfResults.fireNumber} format="currency" higherIsBetter={false} currency={currency} />
          <Delta label="FIRE age" base={baseResults.fireAge} override={whatIfResults.fireAge} format="age" higherIsBetter={false} />
          <Delta label="Years to FIRE" base={baseResults.yearsToFire} override={whatIfResults.yearsToFire} format="years" higherIsBetter={false} />
          <Delta label="PV corpus" base={baseResults.requiredCorpusPV} override={whatIfResults.requiredCorpusPV} format="currency" higherIsBetter={false} currency={currency} />
          <Delta
            label="Money lasts until"
            base={baseResults.depletionAge ?? baseInputs.lifeExpectancy + 1}
            override={whatIfResults.depletionAge ?? baseInputs.lifeExpectancy + 1}
            format="age"
            higherIsBetter
          />
        </View>
      ) : (
        <Text style={styles.idleText}>Drag any slider to see the impact on your plan.</Text>
      )}
    </View>
  );
}

function Delta({
  label,
  base,
  override,
  format,
  higherIsBetter,
  currency
}: {
  label: string;
  base: number | null;
  override: number | null;
  format: "currency" | "age" | "years";
  higherIsBetter: boolean;
  currency?: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (base === null || override === null) return null;
  const diff = override - base;
  const neutral = Math.abs(diff) < 0.05;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const fmt = (value: number) => {
    if (format === "currency") return formatCurrency(value, true, currency);
    if (format === "age") return `Age ${value.toFixed(1)}`;
    return `${value.toFixed(1)} yrs`;
  };
  const valueColor = neutral ? colors.foreground : improved ? colors.success : colors.destructive;
  return (
    <View style={styles.deltaRow}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <View style={styles.deltaValues}>
        <Text style={styles.deltaBase}>{fmt(base)}</Text>
        <Text style={styles.deltaArrow}>→</Text>
        <Text style={[styles.deltaOverride, { color: valueColor }]}>{fmt(override)}</Text>
        {!neutral ? (
          <Text style={[styles.deltaDiff, { color: improved ? colors.success : colors.destructive }]}>
            ({diff > 0 ? "+" : ""}
            {format === "currency" ? formatCurrency(diff, true, currency) : diff.toFixed(1)})
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 14, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  resetText: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800" },
  deltaBox: { borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldWash, borderRadius: 12, padding: 10, gap: 2 },
  deltaTitle: { color: colors.gold, fontSize: 11, fontWeight: "900", marginBottom: 4 },
  deltaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  deltaLabel: { color: colors.mutedForeground, fontSize: 11, flex: 1 },
  deltaValues: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" },
  deltaBase: { color: colors.mutedForeground, fontSize: 11 },
  deltaArrow: { color: colors.mutedForeground, fontSize: 11 },
  deltaOverride: { fontSize: 11, fontWeight: "900" },
  deltaDiff: { fontSize: 10, fontWeight: "800" },
  idleText: { color: colors.mutedForeground, fontSize: 12, textAlign: "center" }
});
