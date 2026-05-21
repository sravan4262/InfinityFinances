import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { AlertTriangle, Flame, Hourglass, Info, Settings2, Target, Timer, TrendingUp } from "lucide-react-native";
import { AppButton } from "@/components/ui/AppButton";
import { NumberField } from "@/components/ui/NumberField";
import { Screen } from "@/components/ui/Screen";
import { StatCard } from "@/components/ui/StatCard";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import { formatCurrency } from "@/lib/utils";
import { getFireCurrency } from "@/lib/currency";
import { useFireStore } from "@/lib/store";
import { useTheme } from "@/theme/ThemeProvider";
import { TopBar } from "@/components/layout/TopBar";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CurrencySelector } from "./CurrencySelector";

export function SimpleFireCalculator() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { inputs, updateInputs, calculate, loadPlan, calculatorView, setCalculatorView, startNewPlan } = useFireStore();
  const [showDefaults, setShowDefaults] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[] | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);

  useEffect(() => {
    let cancelled = false;

    plansApi.isAuthenticated().then((hasSession) => {
      if (cancelled || !hasSession) return;
      plansApi.list()
        .then((plans) => {
          if (!cancelled) setSavedPlans(plans);
        })
        .catch(() => {
          if (!cancelled) setSavedPlans([]);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalSaved = inputs.assets.length > 0
    ? inputs.assets.reduce((sum, asset) => sum + asset.value, 0)
    : inputs.currentPortfolio;
  const monthlySavings = Math.max(0, (inputs.afterTaxIncome - inputs.currentSpending) / 12);
  const monthlyRetirementSpend =
    inputs.monthlyRetirementSalary ?? (inputs.retirementSpending > 0 ? inputs.retirementSpending / 12 : 0);
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;

  const setTotalSaved = (value: number) => {
    updateInputs({
      currentPortfolio: value,
      assets: [
        {
          label: inputs.assets[0]?.label ?? "Stocks / Equity",
          value,
          annualReturn: inputs.expectedReturn || 0.07,
          accountType: inputs.assets[0]?.accountType ?? "taxable"
        }
      ]
    });
  };

  const setMonthlySavings = (value: number) => {
    updateInputs({
      afterTaxIncome: value * 12,
      currentSpending: 0
    });
  };

  const setMonthlyRetirementSpend = (value: number) => {
    updateInputs({
      monthlyRetirementSalary: value,
      retirementSpending: value * 12
    });
  };

  const setExpectedReturn = (value: number) => {
    updateInputs({
      expectedReturn: value,
      assets: inputs.assets.map((asset, index) =>
        index === 0 ? { ...asset, annualReturn: value } : asset
      )
    });
  };

  const preview = useMemo(() => {
    const ready =
      inputs.currentAge > 0 &&
      inputs.retirementAge > inputs.currentAge &&
      inputs.lifeExpectancy > inputs.retirementAge &&
      monthlyRetirementSpend > 0;
    if (!ready) return null;
    return calculateFireMonthly(inputs);
  }, [inputs, monthlyRetirementSpend]);
  const advancedActive = useMemo(() => {
    const items: string[] = [];
    if ((inputs.emis?.length ?? 0) > 0) items.push(`${inputs.emis.length} EMI${inputs.emis.length > 1 ? "s" : ""}`);
    if ((inputs.savingsStreams?.length ?? 0) > 0) items.push(`${inputs.savingsStreams.length} savings stream${inputs.savingsStreams.length > 1 ? "s" : ""}`);
    if ((inputs.futureExpenses?.length ?? 0) > 0) items.push(`${inputs.futureExpenses.length} future expense${inputs.futureExpenses.length > 1 ? "s" : ""}`);
    if ((inputs.futureInvestments?.length ?? 0) > 0) items.push(`${inputs.futureInvestments.length} future purchase${inputs.futureInvestments.length > 1 ? "s" : ""}`);
    const childCount = inputs.children?.length ?? 0;
    if (childCount > 0) items.push(`${childCount} dependent${childCount > 1 ? "s" : ""}`);
    if (inputs.assets.length > 1) items.push(`${inputs.assets.length} asset classes`);
    if ((inputs.socialSecurityBenefit ?? 0) > 0) items.push("SS / NPS");
    if ((inputs.pensionBenefit ?? 0) > 0) items.push("pension");
    if ((inputs.healthcarePremium ?? 0) > 0) items.push("healthcare");
    if ((inputs.effectiveTaxRateAccumulation ?? 0) > 0 || (inputs.effectiveTaxRateRetirement ?? 0) > 0) items.push("taxes");
    if ((inputs.rothConversionAnnual ?? 0) > 0) items.push("Roth ladder");
    return items;
  }, [inputs]);

  if (calculatorView === "overview" && savedPlans && savedPlans.length > 0) {
    return (
      <Screen>
        <TopBar />
        <View style={{ gap: 16, paddingTop: 20 }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={styles.title}>Your retirement plans</Text>
            <Text style={styles.subtitle}>Pick a saved scenario to continue where you left off.</Text>
          </View>
          {savedPlans.map((plan) => {
            const planMonthlySavings = Math.max(0, (plan.inputs.afterTaxIncome - plan.inputs.currentSpending) / 12);
            return (
              <View key={plan.id} style={styles.planCard}>
                <Pressable
                  onPress={() => {
                    loadPlan(plan.id, plan.name, plan.inputs);
                    calculate();
                    router.push("/retire/results");
                  }}
                >
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.planMeta}>Retire at {plan.inputs.retirementAge || "-"} · {formatCurrency(planMonthlySavings, false, plan.inputs.currency)}/mo saved</Text>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                  <Pressable
                    onPress={() => {
                      loadPlan(plan.id, plan.name, plan.inputs);
                      setCalculatorView("editor");
                    }}
                  >
                    <Text style={styles.advancedLink}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPlanToDelete(plan)}
                  >
                    <Text style={{ color: colors.destructive, fontWeight: "800" }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {savedPlans.length < 3 ? (
            <AppButton
              label="Create new plan"
              onPress={startNewPlan}
            />
          ) : null}
        </View>
        <BottomSheet open={!!planToDelete} onClose={() => setPlanToDelete(null)}>
          <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 18 }}>
            Delete {planToDelete?.name}?
          </Text>
          <Text style={{ color: colors.mutedForeground }}>This removes the saved plan permanently.</Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 18 }}>
            <Pressable onPress={() => setPlanToDelete(null)}>
              <Text style={{ color: colors.mutedForeground, fontWeight: "800" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!planToDelete) return;
                plansApi.delete(planToDelete.id).then(() => {
                  setSavedPlans((current) => current ? current.filter((item) => item.id !== planToDelete.id) : current);
                  setPlanToDelete(null);
                });
              }}
            >
              <Text style={{ color: colors.destructive, fontWeight: "900" }}>Delete plan</Text>
            </Pressable>
          </View>
        </BottomSheet>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Flame size={14} color={colors.primary} />
          <Text style={styles.badgeText}>Financial Independence</Text>
        </View>
        <Text style={styles.title}>When can you stop working?</Text>
        <Text style={styles.subtitle}>Six numbers, one answer. Same FIRE engine as the web app, rebuilt for mobile.</Text>
        <Pressable onPress={() => router.push("/retire/advanced")}><Text style={styles.advancedLink}>Need taxes, pension, or a partner? Open Advanced →</Text></Pressable>
      </View>

      <CurrencySelector />

      {advancedActive.length > 0 ? (
        <View style={styles.advancedNotice}>
          <Info size={16} color={colors.gold} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.noticeTitle}>Advanced inputs are active</Text>
            <Text style={styles.noticeText}>{advancedActive.join(", ")} affect this preview.</Text>
            <Pressable onPress={() => router.push("/retire/advanced")}><Text style={styles.advancedLink}>Open Advanced to review</Text></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.fireCard}>
        <Text style={styles.eyebrow}>Your FIRE number</Text>
        <Text style={styles.fireNumber}>{preview ? formatCurrency(preview.fireNumber, false, currency) : "-"}</Text>
        <Text style={styles.fireFormula}>
          {monthlyRetirementSpend > 0
            ? `${formatCurrency(monthlyRetirementSpend, false, currency)}/mo x 12 / ${(inputs.withdrawalRate * 100).toFixed(1)}%`
            : "Fill in retirement spending to preview"}
        </Text>
      </View>

      <View style={styles.formCard}>
        <NumberField
          label="Current age"
          value={inputs.currentAge}
          onChange={(value) => updateInputs({ currentAge: value })}
          min={18}
          max={80}
          suffix="years"
          placeholder="32"
        />
        <NumberField
          label="Target retirement age"
          value={inputs.retirementAge}
          onChange={(value) => updateInputs({ retirementAge: value })}
          min={(inputs.currentAge || 0) + 1}
          max={80}
          suffix="years"
          placeholder="50"
        />
        <NumberField
          label="Total saved today"
          value={totalSaved}
          onChange={setTotalSaved}
          prefix={currencySymbol}
          format="currency"
          placeholder="80,000"
          hint="All investments and savings combined."
        />
        <NumberField
          label="Monthly savings"
          value={monthlySavings}
          onChange={setMonthlySavings}
          prefix={currencySymbol}
          format="currency"
          placeholder="2,000"
        />
        <NumberField
          label="Monthly spend in retirement"
          value={monthlyRetirementSpend}
          onChange={setMonthlyRetirementSpend}
          prefix={currencySymbol}
          format="currency"
          placeholder="5,000"
          hint="Today's dollars. Inflation is handled by the engine."
        />

        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Expected annual return</Text>
            <Text style={styles.sliderValue}>{((inputs.expectedReturn || 0.07) * 100).toFixed(1)}%</Text>
          </View>
          <Slider
            value={(inputs.expectedReturn || 0.07) * 100}
            minimumValue={3}
            maximumValue={12}
            step={0.5}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            onValueChange={(value) => setExpectedReturn(value / 100)}
          />
          <Text style={styles.hint}>Mixed portfolios often sit around 7%; stock-heavy portfolios can be higher.</Text>
        </View>

        <Pressable style={styles.defaultsHeader} onPress={() => setShowDefaults((value) => !value)}>
          <View style={styles.defaultsTitle}>
            <Settings2 size={16} color={colors.mutedForeground} />
            <Text style={styles.defaultsText}>Hidden defaults</Text>
          </View>
          <Text style={styles.defaultsText}>{showDefaults ? "Hide" : "Show"}</Text>
        </Pressable>

        {showDefaults ? (
          <View style={styles.defaultsGrid}>
            <NumberField
              label="Life expectancy"
              value={inputs.lifeExpectancy}
              onChange={(value) => updateInputs({ lifeExpectancy: value })}
              suffix="years"
              min={(inputs.retirementAge || 50) + 1}
              max={110}
            />
            <NumberField
              label="Withdrawal rate"
              value={inputs.withdrawalRate}
              onChange={(value) => updateInputs({ withdrawalRate: value })}
              format="percent"
              suffix="%"
              min={0.02}
              max={0.08}
            />
            <NumberField
              label="Inflation rate"
              value={inputs.inflationRate}
              onChange={(value) => updateInputs({ inflationRate: value })}
              format="percent"
              suffix="%/yr"
              min={0}
              max={0.1}
            />
          </View>
        ) : null}

        <AppButton
          label="See full results"
          disabled={!preview}
          onPress={() => { calculate(); router.push("/retire/results"); }}
          icon={<Flame size={18} color={colors.primaryForeground} />}
        />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            label="Retire at"
            value={preview?.fireAge ? `Age ${preview.fireAge}` : "-"}
            sub={preview?.fireAge && inputs.currentAge ? `${preview.fireAge - inputs.currentAge} yrs from now` : undefined}
            icon={<Target size={14} color={colors.primary} />}
            highlight
          />
          <StatCard
            label="Years to FIRE"
            value={preview?.yearsToFire ? `${preview.yearsToFire}` : "-"}
            sub="of saving"
            icon={<Timer size={14} color={colors.mutedForeground} />}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Money lasts"
            value={preview?.depletionAge ? `Age ${preview.depletionAge}` : preview ? `${inputs.lifeExpectancy}+` : "-"}
            sub={preview?.depletionAge ? "depletes" : preview ? "past plan" : undefined}
            icon={<Hourglass size={14} color={colors.mutedForeground} />}
          />
          <StatCard
            label="Savings rate"
            value={preview ? `${(preview.currentSavingsRate * 100).toFixed(0)}%` : "-"}
            sub="of income"
            icon={<TrendingUp size={14} color={colors.mutedForeground} />}
          />
        </View>
      </View>

      {preview && preview.gapAtTargetAge < 0 ? (
        <View style={styles.warningCallout}>
          <View style={styles.calloutHeader}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={styles.calloutTitle}>Short by {formatCurrency(Math.abs(preview.gapAtTargetAge), false, currency)}</Text>
          </View>
          <Text style={styles.calloutText}>
            At age {inputs.retirementAge} you'll be below the FIRE number.
            {preview.fireAge ? ` FIRE arrives around age ${preview.fireAge}.` : " Try saving more, spending less, or retiring later."}
          </Text>
        </View>
      ) : null}
      {preview && preview.gapAtTargetAge >= 0 ? (
        <View style={styles.successCallout}>
          <View style={styles.calloutHeader}>
            <Flame size={16} color={colors.success} />
            <Text style={styles.calloutTitle}>On track with a {formatCurrency(preview.gapAtTargetAge, true, currency)} cushion</Text>
          </View>
          <Text style={styles.calloutText}>
            At age {inputs.retirementAge}, your projected portfolio clears the FIRE target.
            {preview.fireNumber > 0 ? ` That's a ${((preview.gapAtTargetAge / preview.fireNumber) * 100).toFixed(0)}% buffer.` : ""}
          </Text>
        </View>
      ) : null}

    </Screen>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 12
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 36
  },
  advancedLink: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340
  },
  fireCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryWash,
    padding: 18,
    marginTop: 8,
    marginBottom: 14
  },
  eyebrow: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  fireNumber: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8
  },
  fireFormula: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 8
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 16
  },
  planCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 5
  },
  planTitle: { color: colors.foreground, fontWeight: "900", fontSize: 17 },
  planMeta: { color: colors.mutedForeground, fontSize: 13 },
  sliderBlock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    padding: 14,
    gap: 8
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sliderLabel: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  sliderValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  hint: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 17
  },
  defaultsHeader: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  defaultsTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  defaultsText: {
    color: colors.mutedForeground,
    fontWeight: "800",
    fontSize: 13
  },
  defaultsGrid: {
    gap: 12
  },
  statsGrid: {
    gap: 12,
    marginTop: 14
  },
  statsRow: {
    flexDirection: "row",
    gap: 12
  },
  successCallout: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successWash,
    padding: 16,
    marginTop: 14,
    gap: 6
  },
  warningCallout: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningWash,
    padding: 16,
    marginTop: 14,
    gap: 6
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  calloutTitle: {
    color: colors.foreground,
    fontWeight: "900",
    fontSize: 15
  },
  calloutText: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  advancedNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldWash,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  noticeTitle: {
    color: colors.foreground,
    fontWeight: "900"
  },
  noticeText: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 17
  }
});
