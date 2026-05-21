import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Flame, Hourglass, Shuffle, Target, TrendingUp } from "lucide-react-native";
import { AppButton } from "@/components/ui/AppButton";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { useFireStore } from "@/lib/store";
import { CertaintyPanel } from "./CertaintyPanel";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { MonteCarloFanChart, PortfolioAreaChart } from "@/components/ui/charts";
import { TopBar } from "@/components/layout/TopBar";
import { useChatContextStore } from "@/lib/chatContextStore";
import type { FireCurrency, FireInputs, FireResults } from "@/lib/engine/types";
import { runMonteCarlo } from "@/lib/engine/monteCarlo";
import { HISTORICAL_SCENARIOS, runHistoricalSequence } from "@/lib/engine/historicalSequences";
import { AccountSequencingCard } from "./AccountSequencingCard";
import { MonteCarloDetails } from "./MonteCarloDetails";
import { NominalSalaryCallout } from "./NominalSalaryCallout";
import { PvVsWrCallout } from "./PvVsWrCallout";
import { WhatIfExplorer } from "./WhatIfExplorer";
import { YearlyResultsTable } from "./YearlyResultsTable";
import { ResultsActionRow } from "./ResultsActionRow";
import { RetirementSensitivityTable } from "./RetirementSensitivityTable";

type ResultView = "you" | "spouse" | "combined";

export function FireResultsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { results, spouseResults, unifiedResults, inputs, spouseInputs, includeSpouse, editInputs } = useFireStore();
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);
  const [resultView, setResultView] = useState<ResultView>("you");
  const [whatIfResults, setWhatIfResults] = useState<FireResults | null>(null);
  const [showCertainty, setShowCertainty] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(true);
  const [showMonteCarloBands, setShowMonteCarloBands] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [mcExpanded, setMcExpanded] = useState(false);

  useEffect(() => {
    setChatContext("retirement", {
      inputs: inputs as unknown as Record<string, unknown>,
      results: (results ?? undefined) as unknown as Record<string, unknown> | undefined
    });
    return () => clearChatContext("retirement");
  }, [inputs, results, setChatContext, clearChatContext]);

  useEffect(() => {
    setWhatIfResults(null);
  }, [resultView]);

  const selectedResults = resultView === "spouse" ? spouseResults ?? results : resultView === "combined" ? unifiedResults ?? results : results;
  const selectedInputs = resultView === "spouse" ? spouseInputs : resultView === "combined" ? mergeResultInputs(inputs, spouseInputs) : inputs;
  const monteCarlo = useMemo(() => runMonteCarlo(selectedInputs, 250), [selectedInputs]);
  const historical = useMemo(() => HISTORICAL_SCENARIOS.map((scenario) => runHistoricalSequence(selectedInputs, scenario)), [selectedInputs]);

  if (!results || !selectedResults) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.empty}>
          <Text style={styles.title}>No results yet</Text>
          <Text style={styles.body}>Run the calculator first and this screen will fill in.</Text>
          <AppButton label="Back to calculator" onPress={() => router.replace("/retire")} />
        </View>
      </Screen>
    );
  }

  const currency: FireCurrency = selectedInputs.currency ?? "USD";
  const fireAge = selectedResults.fireAge ? `Age ${selectedResults.fireAge}` : "Not reached";
  const cushion = selectedResults.gapAtTargetAge >= 0;
  const monthlyRetirementSalary = selectedInputs.monthlyRetirementSalary ?? selectedInputs.retirementSpending / 12;
  const hasWhatIf = !!whatIfResults?.yearlyRows.length;
  const successPct = Math.round(monteCarlo.successRate * 100);
  const badgeTone = successPct >= 90 ? colors.success : successPct >= 75 ? colors.warning : colors.destructive;
  const badgeBg = successPct >= 90 ? colors.successWash : successPct >= 75 ? colors.warningWash : "rgba(220, 38, 38, 0.12)";
  const bufferPct = selectedResults.fireNumber > 0 ? (selectedResults.gapAtTargetAge / selectedResults.fireNumber) * 100 : 0;

  const sharePlan = async () => {
    await Share.share({
      message: `Infinity Finances FIRE plan: target ${formatCurrency(selectedResults.fireNumber, false, currency)}, retire ${selectedResults.fireAge ? `at age ${selectedResults.fireAge}` : "not reached yet"}, success rate ${(monteCarlo.successRate * 100).toFixed(0)}%.`
    });
  };
  const editPlan = () => {
    editInputs();
    router.replace("/retire");
  };

  return (
    <Screen>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Your FIRE plan</Text>
        <Text style={styles.hero}>{formatCurrency(selectedResults.fireNumber, false, currency)}</Text>
        <Text style={styles.body}>Withdrawal-rate target · PV corpus {formatCurrency(selectedResults.requiredCorpusPV, false, currency)}</Text>
        <View style={[styles.mcBadge, { borderColor: badgeTone, backgroundColor: badgeBg }]}>
          <Shuffle size={11} color={badgeTone} />
          <Text style={[styles.mcBadgeText, { color: badgeTone }]}>{successPct}% chance of not running out</Text>
        </View>
      </View>
      {includeSpouse ? (
        <SegmentedControl
          value={resultView}
          options={[{ label: "You", value: "you" }, { label: "Spouse", value: "spouse" }, { label: "Combined", value: "combined" }]}
          onChange={setResultView}
        />
      ) : null}
      <ResultsActionRow
        inputs={selectedInputs}
        onCertainty={() => setShowCertainty(!showCertainty)}
        onEdit={editPlan}
        onShare={sharePlan}
      />
      <View style={styles.grid}>
        <View style={styles.row}>
          <StatCard label="FIRE number" value={formatCurrency(selectedResults.fireNumber, true, currency)} sub="target corpus" icon={<Target size={14} color={colors.primary} />} highlight />
          <StatCard label="Retire at" value={fireAge} sub={selectedResults.yearsToFire !== null ? `${selectedResults.yearsToFire} yrs from now` : undefined} icon={<Target size={14} color={colors.mutedForeground} />} />
        </View>
        <View style={styles.row}>
          <StatCard label="Years to FIRE" value={selectedResults.yearsToFire !== null ? `${selectedResults.yearsToFire}` : "-"} sub="from today" icon={<Hourglass size={14} color={colors.mutedForeground} />} />
          <StatCard label="Savings rate" value={`${(selectedResults.currentSavingsRate * 100).toFixed(0)}%`} sub="of income" icon={<TrendingUp size={14} color={colors.mutedForeground} />} />
        </View>
        <View style={styles.row}>
          <StatCard label="PV corpus" value={formatCurrency(selectedResults.requiredCorpusPV, true, currency)} sub="today's dollars" icon={<Flame size={14} color={colors.mutedForeground} />} />
          <StatCard label="Money lasts" value={selectedResults.depletionAge ? `Age ${selectedResults.depletionAge}` : `${selectedInputs.lifeExpectancy}+`} sub={selectedResults.depletionAge ? "depletes" : "past plan"} icon={<Hourglass size={14} color={colors.mutedForeground} />} />
        </View>
      </View>

      <NominalSalaryCallout
        todaysMonthly={monthlyRetirementSalary}
        nominalMonthly={selectedResults.nominalRetirementSalary}
        retirementAge={selectedInputs.retirementAge}
        currency={currency}
      />

      <View style={cushion ? styles.success : styles.warning}>
        <Text style={styles.calloutTitle}>
          {cushion
            ? `On track with ${formatCurrency(selectedResults.gapAtTargetAge, true, currency)} cushion`
            : `Short by ${formatCurrency(Math.abs(selectedResults.gapAtTargetAge), true, currency)}`}
        </Text>
        <Text style={styles.body}>
          {cushion
            ? `At age ${selectedInputs.retirementAge}, your projected portfolio clears the target.${selectedResults.fireNumber > 0 ? ` That's a ${bufferPct.toFixed(0)}% buffer.` : ""}`
            : selectedResults.fireAge
            ? `At age ${selectedInputs.retirementAge}, you are below target; FIRE arrives around age ${selectedResults.fireAge}.`
            : "Try saving more, spending less, or retiring later."}
        </Text>
      </View>

      <PvVsWrCallout results={selectedResults} inputs={selectedInputs} currency={currency} />

      <View style={styles.chartCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Portfolio growth</Text>
            <Text style={styles.sectionSubtitle}>Year-by-year projection</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.legendRow}>
              <Legend color={colors.primary} label="Base" />
              {hasWhatIf ? <Legend color={colors.gold} label="What-if" dashed /> : null}
              {showMonteCarloBands ? <Legend color={colors.primaryWash} label="p10-p90" swatch /> : null}
              <Legend color={colors.gold} label="FIRE target" dashed />
            </View>
            <ExpandButton onPress={() => setChartExpanded(true)} />
          </View>
        </View>
        <PortfolioAreaChart
          rows={selectedResults.yearlyRows}
          whatIfRows={whatIfResults?.yearlyRows ?? []}
          monteCarloRows={monteCarlo.percentileRows}
          fireNumber={selectedResults.fireNumber}
          retirementAge={selectedInputs.retirementAge}
          currency={currency}
          height={190}
          showWhatIf
          showMonteCarlo={showMonteCarloBands}
          compact
        />
      </View>

      <FullscreenModal
        open={chartExpanded}
        onClose={() => setChartExpanded(false)}
        title="Portfolio growth"
        subtitle="Scroll or drag across the chart to inspect each year."
        meta={
          <View style={styles.chartToggleRow}>
            <TogglePill label="Base" active onPress={() => {}} />
            <TogglePill label="What-if" active={showWhatIf} onPress={() => setShowWhatIf(!showWhatIf)} />
            <TogglePill label="Monte Carlo bands" active={showMonteCarloBands} onPress={() => setShowMonteCarloBands(!showMonteCarloBands)} />
          </View>
        }
        footer={
          <View style={styles.legendRow}>
            <Legend color={colors.primary} label="Base" />
            {hasWhatIf ? <Legend color={colors.gold} label="What-if" dashed /> : null}
            {showMonteCarloBands ? <Legend color={colors.primaryWash} label="Monte Carlo bands" swatch /> : null}
            <Legend color={colors.gold} label="FIRE target" dashed />
          </View>
        }
      >
        <PortfolioAreaChart
          rows={selectedResults.yearlyRows}
          whatIfRows={whatIfResults?.yearlyRows ?? []}
          monteCarloRows={monteCarlo.percentileRows}
          fireNumber={selectedResults.fireNumber}
          retirementAge={selectedInputs.retirementAge}
          currency={currency}
          height={420}
          minWidth={1100}
          showWhatIf={showWhatIf}
          showMonteCarlo={showMonteCarloBands}
        />
      </FullscreenModal>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What-if explorer</Text>
        <WhatIfExplorer baseInputs={selectedInputs} baseResults={selectedResults} onWhatIfChange={setWhatIfResults} />
      </View>

      <AccountSequencingCard seq={selectedResults.accountSequencing} retirementAge={selectedInputs.retirementAge} currency={currency} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FIRE variants</Text>
        <View style={styles.variantRow}>
          <Variant label="Lean" value={selectedResults.leanFireNumber} tone={colors.success} currency={currency} />
          <Variant label="Standard" value={selectedResults.fireNumber} tone={colors.primary} currency={currency} />
          <Variant label="Fat" value={selectedResults.fatFireNumber} tone={colors.gold} currency={currency} />
        </View>
        <View style={styles.variantRow}>
          <Variant label="Coast" value={selectedResults.coastFireNumber} tone={colors.chart5} currency={currency} />
          <Variant label="Barista" value={selectedResults.baristaFireNumber} tone={colors.warning} currency={currency} />
        </View>
      </View>

      {selectedResults.retirementSensitivity?.length > 0 ? (
        <View style={styles.section}>
          <RetirementSensitivityTable
            rows={selectedResults.retirementSensitivity}
            plannedRetirementAge={selectedInputs.retirementAge}
            currency={currency}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Monte Carlo</Text>
          <ExpandButton onPress={() => setMcExpanded(true)} />
        </View>
        <MonteCarloDetails mc={monteCarlo} retirementAge={selectedInputs.retirementAge} lifeExpectancy={selectedInputs.lifeExpectancy} currency={currency} />
        <MonteCarloFanChart rows={monteCarlo.percentileRows} fireNumber={selectedResults.fireNumber} retirementAge={selectedInputs.retirementAge} currency={currency} height={190} compact />
      </View>

      <FullscreenModal
        open={mcExpanded}
        onClose={() => setMcExpanded(false)}
        title="Monte Carlo"
        subtitle="Median path with p10–p90 confidence bands. Drag across the chart to scrub year-by-year."
      >
        <MonteCarloFanChart
          rows={monteCarlo.percentileRows}
          fireNumber={selectedResults.fireNumber}
          retirementAge={selectedInputs.retirementAge}
          currency={currency}
          height={420}
        />
      </FullscreenModal>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historical sequences</Text>
        {historical.map((item) => (
          <View key={item.scenario.shortLabel} style={styles.listRowTall}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listLabel}>{item.scenario.label}</Text>
              <Text style={styles.smallText}>{item.scenario.description}</Text>
            </View>
            <Text style={[styles.listValue, { color: item.survived ? colors.success : colors.destructive }]}>
              {item.survived ? formatCurrency(item.portfolioAtEnd, true, currency) : `Depletes ${item.depletionAge}`}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <YearlyResultsTable rows={selectedResults.yearlyRows} fireAge={selectedResults.fireAge} currency={currency} />
      </View>

      <View style={styles.section}>
        <Text onPress={() => setShowCertainty(!showCertainty)} style={styles.link}>
          {showCertainty ? "Hide" : "Run"} certainty check
        </Text>
        {showCertainty ? <CertaintyPanel inputs={selectedInputs} /> : null}
      </View>

    </Screen>
  );
}

function Variant({ label, value, tone, currency }: { label: string; value: number; tone: string; currency?: FireCurrency }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: "center", gap: 5 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "800" }}>{label}</Text>
      <Text style={{ color: tone, fontWeight: "900" }}>{formatCurrency(value, true, currency)}</Text>
    </View>
  );
}

function Legend({ color, label, dashed = false, swatch = false }: { color: string; label: string; dashed?: boolean; swatch?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: swatch ? 18 : 14,
          height: swatch ? 10 : 2,
          borderRadius: swatch ? 3 : 999,
          backgroundColor: swatch ? color : dashed ? "transparent" : color,
          borderColor: dashed || swatch ? color : colors.border,
          borderStyle: dashed ? "dashed" : "solid",
          borderTopWidth: dashed ? 2 : 0,
          borderWidth: swatch ? 1 : 0
        }}
      />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function TogglePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryWash : colors.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}
    >
      <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function mergeResultInputs(a: FireInputs, b: FireInputs): FireInputs {
  return {
    ...a,
    afterTaxIncome: a.afterTaxIncome + b.afterTaxIncome,
    currentSpending: a.currentSpending + b.currentSpending,
    currentPortfolio: a.currentPortfolio + b.currentPortfolio,
    retirementSpending: a.retirementSpending + b.retirementSpending,
    monthlyRetirementSalary: (a.monthlyRetirementSalary ?? 0) + (b.monthlyRetirementSalary ?? 0),
    assets: [...(a.assets ?? []), ...(b.assets ?? [])]
  };
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  header: { alignItems: "center", gap: 8, paddingVertical: 20 },
  eyebrow: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  hero: { color: colors.primary, fontSize: 38, fontWeight: "900" },
  mcBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  mcBadgeText: { fontSize: 11, fontWeight: "900" },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20, textAlign: "center" },
  grid: { gap: 12, marginTop: 14 },
  row: { flexDirection: "row", gap: 12 },
  success: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successWash, padding: 16, gap: 6 },
  warning: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warningWash, padding: 16, gap: 6 },
  calloutTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "center" },
  section: { marginTop: 16, gap: 10 },
  chartCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, marginTop: 16, overflow: "hidden", padding: 14 },
  sectionHeaderRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  sectionSubtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  headerActions: { alignItems: "flex-end", flexShrink: 1, gap: 8 },
  variantRow: { flexDirection: "row", gap: 10 },
  chartToggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  listRow: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listRowTall: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
  listLabel: { color: colors.mutedForeground, fontWeight: "700" },
  listValue: { color: colors.foreground, fontWeight: "900", textAlign: "right" },
  smallText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  link: { color: colors.primary, fontWeight: "900" },
  empty: { flex: 1, justifyContent: "center", gap: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: "900" }
});
