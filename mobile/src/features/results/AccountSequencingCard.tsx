import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ArrowRightLeft, ChevronDown, ChevronRight, Shield } from "lucide-react-native";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { AccountSequencingResult, FireCurrency } from "@/lib/engine/types";

type Accent = "default" | "success" | "warning";

export function AccountSequencingCard({
  seq,
  retirementAge,
  currency
}: {
  seq: AccountSequencingResult;
  retirementAge: number;
  currency: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const total = seq.taxableAtRetirement + seq.rothAtRetirement + seq.traditionalAtRetirement;
  const hasMixedAccounts = seq.rothAtRetirement > 0 || seq.traditionalAtRetirement > 0;
  const hasEarlyPenalty = seq.earlyPenaltyTotal > 0;
  const isBridgeNeeded = seq.bridgeYears > 0;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={16} color={colors.primary} />
          <View>
            <Text style={styles.title}>Account sequencing</Text>
            <Text style={styles.subtitle}>Withdrawal order · bridge years · Roth ladder</Text>
          </View>
        </View>
        {expanded ? <ChevronDown size={16} color={colors.mutedForeground} /> : <ChevronRight size={16} color={colors.mutedForeground} />}
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          {hasMixedAccounts ? (
            <View style={styles.balances}>
              <Text style={styles.sectionLabel}>Estimated balances at retirement (age {retirementAge})</Text>
              <View style={styles.bucketsRow}>
                <Bucket label="Taxable" value={seq.taxableAtRetirement} total={total} tone={colors.primary} currency={currency} />
                <Bucket label="Roth" value={seq.rothAtRetirement} total={total} tone={colors.success} currency={currency} />
                <Bucket label="Traditional" value={seq.traditionalAtRetirement} total={total} tone={colors.gold} currency={currency} />
              </View>
            </View>
          ) : null}
          <View style={styles.summary}>
            <Text style={styles.sectionLabel}>Sequencing summary</Text>
            <InfoRow label="Withdrawal order" value="Taxable → Roth basis → Traditional" sub="Defers taxes longest; Roth earnings last" />
            {isBridgeNeeded ? (
              <InfoRow
                label="Taxable bridge years"
                value={`${seq.bridgeYears.toFixed(1)} years`}
                sub={`From age ${retirementAge} to 59½ — funded by taxable accounts`}
                accent={seq.taxableAtRetirement > 0 ? "success" : "warning"}
              />
            ) : null}
            {seq.taxableDepletionAge !== null ? (
              <InfoRow label="Taxable depletes at" value={`Age ${seq.taxableDepletionAge}`} sub="Roth basis takes over from here" />
            ) : null}
            {seq.conversionLadderFirstAccessAge !== null ? (
              <InfoRow
                label="Roth ladder first access"
                value={`Age ${seq.conversionLadderFirstAccessAge}`}
                sub="First conversion tranche unlocks (5-year rule)"
                accent="success"
              />
            ) : null}
            {hasEarlyPenalty ? (
              <InfoRow
                label="Early withdrawal penalties"
                value={formatCurrency(seq.earlyPenaltyTotal, true, currency)}
                sub="10% penalty on Traditional accessed before age 59½"
                accent="warning"
              />
            ) : null}
          </View>
          {isBridgeNeeded && seq.taxableAtRetirement <= 0 ? (
            <Alert
              tone="warning"
              title="No taxable bridge."
              body={`You retire at ${retirementAge} but have no taxable assets to bridge until 59½. Add taxable brokerage assets or set up a Roth conversion ladder.`}
            />
          ) : null}
          {hasEarlyPenalty ? (
            <Alert
              tone="warning"
              title="Early penalty detected."
              body={`${formatCurrency(seq.earlyPenaltyTotal, true, currency)} in 10% penalties from accessing Traditional accounts before age 59½. Increase taxable or Roth assets to avoid this.`}
            />
          ) : null}
          {seq.conversionLadderFirstAccessAge !== null ? (
            <Alert
              tone="info"
              title="Roth ladder active."
              body={`Conversions start unlocking at age ${seq.conversionLadderFirstAccessAge}. Each tranche is accessible tax-free and penalty-free once the 5-year clock runs out.`}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Bucket({ label, value, total, tone, currency }: { label: string; value: number; total: number; tone: string; currency: FireCurrency }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.bucket}>
      <Text style={[styles.bucketLabel, { color: tone, borderColor: tone }]}>{label}</Text>
      <Text style={styles.bucketValue}>{formatCurrency(value, true, currency)}</Text>
      <Text style={styles.bucketPct}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

function InfoRow({ label, value, sub, accent = "default" }: { label: string; value: string; sub?: string; accent?: Accent }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const valueColor = accent === "success" ? colors.success : accent === "warning" ? colors.warning : colors.foreground;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
        {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Alert({ tone, title, body }: { tone: "warning" | "info"; title: string; body: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const Icon = tone === "warning" ? AlertTriangle : ArrowRightLeft;
  const color = tone === "warning" ? colors.warning : colors.primary;
  const bg = tone === "warning" ? colors.warningWash : colors.primaryWash;
  return (
    <View style={[styles.alert, { borderColor: color, backgroundColor: bg }]}>
      <Icon size={14} color={color} />
      <Text style={styles.alertText}>
        <Text style={{ color, fontWeight: "900" }}>{title}</Text> <Text style={styles.alertBody}>{body}</Text>
      </Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, overflow: "hidden" },
  header: { paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  balances: { gap: 8 },
  sectionLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  bucketsRow: { flexDirection: "row", gap: 8 },
  bucket: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, paddingHorizontal: 10, paddingVertical: 10, alignItems: "center", gap: 6 },
  bucketLabel: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: "900" },
  bucketValue: { color: colors.foreground, fontSize: 13, fontWeight: "900" },
  bucketPct: { color: colors.mutedForeground, fontSize: 10 },
  summary: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, padding: 12, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.mutedForeground, fontSize: 12, flex: 1 },
  infoRight: { alignItems: "flex-end", maxWidth: "60%" },
  infoValue: { fontSize: 12, fontWeight: "900" },
  infoSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 2, textAlign: "right" },
  alert: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  alertText: { flex: 1, fontSize: 11, lineHeight: 16 },
  alertBody: { color: colors.mutedForeground }
});
