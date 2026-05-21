import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Home, RotateCcw } from "lucide-react-native";
import { MultiAreaChart, ScrollableTable } from "@/components/ui/charts";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { NumberField } from "@/components/ui/NumberField";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { breakEvenMonth, buildBreakEvenTable, fmtBreakEven, pmt } from "./math";
import { breakDefaults, useHomeCalcStore } from "./store";
import type { BreakEvenRow } from "./types";

export function BreakEvenView() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { breakEven, updateBreakEven, loadProfileInputs } = useHomeCalcStore();
  const rows = useMemo(() => buildBreakEvenTable(breakEven), [breakEven]);
  const advancedBreakMonth = useMemo(() => breakEvenMonth(breakEven, true), [breakEven]);
  const basicBreakMonth = useMemo(() => breakEvenMonth(breakEven, false), [breakEven]);
  const fiveYearRow = rows.find((row) => row.year === 5) ?? rows[Math.min(4, rows.length - 1)];
  const monthlyPI = pmt(breakEven.purchasePrice - breakEven.downPayment, breakEven.interestRate, breakEven.loanTermYears);

  return (
    <View style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Break-even</Text>
        <Pressable onPress={() => loadProfileInputs({ breakEven: breakDefaults })} style={styles.iconText}>
          <RotateCcw size={14} color={colors.primary} />
          <Text style={styles.link}>Reset defaults</Text>
        </Pressable>
      </View>

      {breakEven.purchasePrice > 0 ? (
        <>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Start here</Text>
            <Text style={styles.introBody}>
              Compares what you put into the house against what you get back when you sell. Basic Net uses house-only costs; Advanced Net adds rent avoided and subtracts opportunity cost.
            </Text>
          </View>

          <View style={styles.row}>
            <StatCard label="Monthly P&I" value={formatCurrency(monthlyPI)} sub="principal + interest" highlight />
            <StatCard label="Basic BE" value={fmtBreakEven(basicBreakMonth)} sub="house-only math" />
          </View>
          <View style={styles.row}>
            <StatCard label="Adv. BE" value={fmtBreakEven(advancedBreakMonth)} sub="rent saved + opp. cost" highlight />
            <StatCard
              label="Adv. net @ 5 yrs"
              value={formatCurrency(fiveYearRow?.advancedNet ?? 0, true)}
              sub={(fiveYearRow?.advancedNet ?? 0) >= 0 ? "above zero" : "below zero"}
            />
          </View>

          {(() => {
            const series = [
              { label: "Basic Net", color: colors.success, points: rows.map((row) => ({ x: row.year, y: row.basicNet })) },
              { label: "Adv. Net", color: colors.primary, points: rows.map((row) => ({ x: row.year, y: row.advancedNet })) }
            ];
            return (
              <ExpandableCard
                title="Break-even over time"
                subtitle="Where lines cross zero, buying starts to beat renting."
                compact={<MultiAreaChart series={series} compact />}
                expanded={<MultiAreaChart series={series} height={420} />}
              />
            );
          })()}

          {rows.length ? <BreakEvenTable rows={rows} /> : null}
          <ColumnGuide />
        </>
      ) : (
        <EmptyState text="Enter a purchase price to see break-even results." />
      )}

      <SectionCard title="Purchase" icon={<Home size={16} color={colors.primary} />} defaultOpen>
        <NumberField
          label="Purchase price"
          value={breakEven.purchasePrice}
          onChange={(purchasePrice) => updateBreakEven({ purchasePrice })}
          prefix="$"
          format="currency"
          hint="The listed or agreed-upon sale price of the home"
        />
        <NumberField
          label="Down payment"
          value={breakEven.downPayment}
          onChange={(downPayment) => updateBreakEven({ downPayment })}
          prefix="$"
          format="currency"
          hint="Upfront cash — 20% of price avoids PMI"
        />
        <NumberField
          label="Interest rate"
          value={breakEven.interestRate / 100}
          onChange={(value) => updateBreakEven({ interestRate: value * 100 })}
          format="percent"
          suffix="%"
          hint="Fixed rate your lender quotes (check today's rates)"
        />
        <NumberField
          label="Loan term"
          value={breakEven.loanTermYears}
          onChange={(loanTermYears) => updateBreakEven({ loanTermYears })}
          suffix="years"
          hint="30yr = lower payment; 15yr = less total interest"
        />
        <NumberField
          label="Closing costs"
          value={breakEven.initialClosingCosts}
          onChange={(initialClosingCosts) => updateBreakEven({ initialClosingCosts })}
          prefix="$"
          format="currency"
          hint="~2–5% of price: title, appraisal, lender fees"
        />
      </SectionCard>

      <SectionCard title="Ownership costs">
        <NumberField
          label="Property tax"
          value={breakEven.annualPropertyTax}
          onChange={(annualPropertyTax) => updateBreakEven({ annualPropertyTax })}
          prefix="$"
          suffix="/yr"
          format="currency"
        />
        <NumberField
          label="Insurance"
          value={breakEven.annualInsurance}
          onChange={(annualInsurance) => updateBreakEven({ annualInsurance })}
          prefix="$"
          suffix="/yr"
          format="currency"
        />
        <NumberField
          label="Maintenance"
          value={breakEven.annualMaintenance}
          onChange={(annualMaintenance) => updateBreakEven({ annualMaintenance })}
          prefix="$"
          suffix="/yr"
          format="currency"
        />
        <NumberField
          label="Monthly HOA"
          value={breakEven.monthlyHOA}
          onChange={(monthlyHOA) => updateBreakEven({ monthlyHOA })}
          prefix="$"
          format="currency"
          hint="Monthly fee for condos/communities — 0 if none"
        />
        <NumberField
          label="Years to show"
          value={breakEven.maxYears}
          onChange={(maxYears) => updateBreakEven({ maxYears: Math.max(1, Math.floor(maxYears)) })}
          min={1}
          max={40}
          suffix="years"
          hint="Limit table rows to this many years"
        />
      </SectionCard>

      <SectionCard title="Assumptions">
        <NumberField
          label="Appreciation"
          value={breakEven.annualAppreciation / 100}
          onChange={(value) => updateBreakEven({ annualAppreciation: value * 100 })}
          format="percent"
          suffix="%/yr"
          hint="US avg ~3–4%/yr; check your local market trend"
        />
        <NumberField
          label="Selling cost"
          value={breakEven.sellingCostPercent / 100}
          onChange={(value) => updateBreakEven({ sellingCostPercent: value * 100 })}
          format="percent"
          suffix="%"
          hint="Agent commission + transfer fees"
        />
        <NumberField
          label="Monthly rent saved"
          value={breakEven.monthlyRentSaved}
          onChange={(monthlyRentSaved) => updateBreakEven({ monthlyRentSaved })}
          prefix="$"
          format="currency"
          hint="What you'd otherwise pay in rent"
        />
        <NumberField
          label="Rent growth"
          value={breakEven.annualRentGrowth / 100}
          onChange={(value) => updateBreakEven({ annualRentGrowth: value * 100 })}
          format="percent"
          suffix="%/yr"
        />
        <NumberField
          label="Opportunity cost"
          value={breakEven.opportunityCostRate / 100}
          onChange={(value) => updateBreakEven({ opportunityCostRate: value * 100 })}
          format="percent"
          suffix="%/yr"
          hint="What the down payment could earn in the market (~6–7% S&P)"
        />
        <NumberField
          label="Annual tax benefit"
          value={breakEven.annualTaxBenefit}
          onChange={(annualTaxBenefit) => updateBreakEven({ annualTaxBenefit })}
          prefix="$"
          format="currency"
          hint="Leave 0 if unsure"
        />
      </SectionCard>

      <View style={styles.glossary}>
        <Text style={styles.glossaryTitle}>How to read results</Text>
        <Text style={styles.glossaryBody}>
          <Text style={styles.bold}>Basic Net:</Text> sale proceeds minus down, closing, interest, ownership costs.
        </Text>
        <Text style={styles.glossaryBody}>
          <Text style={styles.bold}>Advanced Net:</Text> Basic Net plus rent avoided and tax benefit, minus opportunity cost on upfront cash.
        </Text>
        <Text style={styles.glossaryBody}>
          <Text style={styles.bold}>Break-even:</Text> first year the chosen net turns positive.
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.emptyState}>
      <Text style={styles.small}>{text}</Text>
    </View>
  );
}

function BreakEvenTable({ rows }: { rows: BreakEvenRow[] }) {
  const { colors } = useTheme();
  const columns: { label: string; key: keyof BreakEvenRow; tone?: string }[] = [
    { label: "Sale", key: "salePrice" },
    { label: "Loan", key: "loanBalance" },
    { label: "Selling", key: "sellingCosts", tone: colors.destructive },
    { label: "Interest", key: "interestPaid", tone: colors.destructive },
    { label: "Tax+Ins+Maint", key: "otherCosts", tone: colors.destructive },
    { label: "Cash Back", key: "cashBack", tone: colors.success },
    { label: "Rent Saved", key: "rentSaved", tone: colors.primary },
    { label: "Opp. Cost", key: "oppCost", tone: colors.destructive },
    { label: "Basic Net", key: "basicNet" },
    { label: "Adv. Net", key: "advancedNet" }
  ];
  return (
    <ScrollableTable<BreakEvenRow>
      rows={rows}
      stickyLabel="Year"
      stickyValue={(row) => String(row.year)}
      title="Year-by-year detail"
      subtitle={`${rows.length} years · swipe horizontally to see every column`}
      expandable
      previewRows={5}
      columns={columns.map((column) => ({
        label: column.label,
        render: (row) => formatCurrency(Number(row[column.key]), true),
        color: () => column.tone
      }))}
    />
  );
}

function ColumnGuide() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const guides: { label: string; tone?: string; body: string }[] = [
    { label: "Sale Price", body: "Home value after annual appreciation compounds." },
    { label: "Loan Balance", body: "What you still owe the bank at year-end." },
    { label: "Selling Costs", tone: colors.destructive, body: "Agent commission + transfer fees (% of sale price)." },
    { label: "Interest Paid", tone: colors.destructive, body: "Cumulative mortgage interest paid to this point." },
    { label: "Tax+Ins+Maint", tone: colors.destructive, body: "Cumulative annual ownership costs." },
    { label: "Cash Back", tone: colors.success, body: "Sale proceeds minus loan payoff and selling costs." },
    { label: "Rent Saved", tone: colors.primary, body: "Total rent you avoided by owning instead of renting." },
    { label: "Opp. Cost", tone: colors.destructive, body: "What the down payment could have grown to in the stock market." },
    { label: "Basic Net", body: "Cash Back minus all house costs vs. your initial investment." },
    { label: "Adv. Net", body: "Basic Net plus rent saved and tax benefit, minus opportunity cost." }
  ];
  return (
    <View style={styles.guide}>
      <Text style={styles.guideTitle}>Column guide</Text>
      {guides.map((item) => (
        <Text key={item.label} style={styles.guideRow}>
          <Text style={[styles.guideLabel, item.tone ? { color: item.tone } : null]}>{item.label}</Text>
          <Text style={styles.guideBody}> — {item.body}</Text>
        </Text>
      ))}
      <Text style={styles.guideFooter}>Does not include PMI, utilities, or moving costs.</Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12, marginTop: 16 },
  emptyState: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14 },
  iconText: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: colors.primary, fontWeight: "900" },
  row: { flexDirection: "row", gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  small: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  intro: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated, borderRadius: 12, padding: 12, gap: 4 },
  introTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  introBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  glossary: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 12, gap: 6 },
  glossaryTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  glossaryBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  bold: { color: colors.foreground, fontWeight: "900" },
  guide: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, padding: 12, gap: 4 },
  guideTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900", marginBottom: 4 },
  guideRow: { fontSize: 11, lineHeight: 16 },
  guideLabel: { color: colors.foreground, fontWeight: "900" },
  guideBody: { color: colors.mutedForeground },
  guideFooter: { color: colors.mutedForeground, fontSize: 11, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }
});
