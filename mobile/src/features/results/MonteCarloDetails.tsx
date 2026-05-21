import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AlertTriangle, CheckCircle2, Shuffle, TrendingDown } from "lucide-react-native";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, MonteCarloResults } from "@/lib/engine/types";

export function MonteCarloDetails({
  mc,
  retirementAge,
  lifeExpectancy,
  currency
}: {
  mc: MonteCarloResults;
  retirementAge: number;
  lifeExpectancy: number;
  currency: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const retRow = mc.percentileRows.find((row) => row.age >= retirementAge);
  const endRow = mc.percentileRows.find((row) => row.age >= lifeExpectancy);
  const successPct = Math.round(mc.successRate * 100);
  const tier = successPct >= 90 ? "high" : successPct >= 75 ? "ok" : "low";
  const tierColor = tier === "high" ? colors.success : tier === "ok" ? colors.warning : colors.destructive;
  const tierBg = tier === "high" ? colors.successWash : tier === "ok" ? colors.warningWash : "rgba(220, 38, 38, 0.12)";
  const tierIcon = tier === "high" ? CheckCircle2 : tier === "ok" ? AlertTriangle : TrendingDown;
  const TierIcon = tierIcon;
  const tierBody =
    tier === "high"
      ? "Your plan survives in the vast majority of randomized scenarios. You're in excellent shape."
      : tier === "ok"
      ? "Reasonable but not bulletproof — consider a small spending buffer or one extra year of savings."
      : "High risk of portfolio depletion. Increase savings, reduce spending, or delay retirement by a few years.";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Shuffle size={16} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>How certain is your FIRE?</Text>
          <Text style={styles.subtitle}>
            {mc.numTrials.toLocaleString()} simulations · σ = {(mc.annualVolatility * 100).toFixed(1)}% annual volatility
          </Text>
        </View>
      </View>
      <View style={styles.topRow}>
        <SuccessRing rate={mc.successRate} />
        <View style={styles.statsGrid}>
          <StatChip label="Median @ retirement" value={retRow ? formatCurrency(retRow.p50, true, currency) : "—"} />
          <StatChip label="p10 @ retirement" value={retRow ? formatCurrency(retRow.p10, true, currency) : "—"} tone={colors.destructive} />
          <StatChip label="Median EOL" value={endRow ? formatCurrency(endRow.p50, true, currency) : "—"} />
          <StatChip
            label="Worst depletion age"
            value={mc.worstCaseDepletionAge ? `Age ${mc.worstCaseDepletionAge}` : `${lifeExpectancy}+`}
            tone={mc.worstCaseDepletionAge ? colors.destructive : colors.success}
          />
        </View>
      </View>
      <View style={[styles.tierCallout, { borderColor: tierColor, backgroundColor: tierBg }]}>
        <TierIcon size={14} color={tierColor} />
        <Text style={styles.tierText}>
          <Text style={[styles.tierBold, { color: tierColor }]}>{successPct}% success rate.</Text> {tierBody}
        </Text>
      </View>
      <SequenceRiskMeter score={mc.sequenceRiskScore} />
      <View style={styles.explainer}>
        <Text style={styles.explainerTitle}>What is sequence-of-returns risk?</Text>
        <Text style={styles.explainerBody}>
          Even with identical average returns, retiring into a bear market forces selling assets at low prices to fund spending. Those sold shares can't participate in the eventual recovery — permanently shrinking the portfolio.
        </Text>
        <Text style={styles.explainerBody}>
          <Text style={styles.explainerBold}>Mitigations:</Text> a 1–2 year cash buffer, a bond tent at retirement, or flexible spending (reduce withdrawals 10–15% in down years).
        </Text>
      </View>
    </View>
  );
}

function SuccessRing({ rate }: { rate: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const pct = Math.max(0, Math.min(100, Math.round(rate * 100)));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const color = pct >= 90 ? colors.success : pct >= 75 ? colors.warning : colors.destructive;
  return (
    <View style={styles.ringWrap}>
      <Svg width={92} height={92} viewBox="0 0 92 92">
        <Circle cx={46} cy={46} r={radius} fill="none" stroke={colors.cardElevated} strokeWidth={7} />
        <Circle
          cx={46}
          cy={46}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
        />
      </Svg>
      <View style={styles.ringContent}>
        <Text style={[styles.ringPct, { color }]}>{pct}%</Text>
        <Text style={styles.ringLabel}>success</Text>
      </View>
    </View>
  );
}

function SequenceRiskMeter({ score }: { score: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const risk = 1 - Math.max(0, Math.min(1, score));
  const riskPct = Math.round(risk * 100);
  const label = riskPct >= 70 ? "High" : riskPct >= 40 ? "Moderate" : "Low";
  const color = riskPct >= 70 ? colors.destructive : riskPct >= 40 ? colors.warning : colors.success;
  const explainer = riskPct >= 70
    ? "Severe sequence risk. Consider a bond tent or cash buffer."
    : riskPct >= 40
    ? "Moderate risk. A 1–2 year cash reserve would help."
    : "Low risk. Your taxable bridge provides a good cushion.";
  return (
    <View style={styles.meterWrap}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>Sequence-of-returns risk</Text>
        <Text style={[styles.meterTier, { color }]}>{label}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${riskPct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.meterBody}>
        p10 portfolio at retirement is {Math.round(score * 100)}% of the median — {explainer}
      </Text>
    </View>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipLabel}>{label}</Text>
      <Text style={[styles.statChipValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 14, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  ringWrap: { width: 92, height: 92, alignItems: "center", justifyContent: "center" },
  ringContent: { position: "absolute", alignItems: "center" },
  ringPct: { fontSize: 20, fontWeight: "900" },
  ringLabel: { color: colors.mutedForeground, fontSize: 9, fontWeight: "700", marginTop: 2 },
  statsGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statChip: { width: "48%", borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardElevated, padding: 8, gap: 2 },
  statChipLabel: { color: colors.mutedForeground, fontSize: 10 },
  statChipValue: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  tierCallout: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  tierText: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16, flex: 1 },
  tierBold: { fontWeight: "900" },
  meterWrap: { gap: 6 },
  meterHeader: { flexDirection: "row", justifyContent: "space-between" },
  meterLabel: { color: colors.mutedForeground, fontSize: 11 },
  meterTier: { fontSize: 11, fontWeight: "900" },
  meterTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cardElevated, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: 3 },
  meterBody: { color: colors.mutedForeground, fontSize: 10, lineHeight: 14 },
  explainer: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, padding: 10, gap: 6 },
  explainerTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  explainerBody: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16 },
  explainerBold: { color: colors.foreground, fontWeight: "900" }
});
