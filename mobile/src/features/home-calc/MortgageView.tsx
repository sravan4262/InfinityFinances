import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Home, RotateCcw } from "lucide-react-native";
import { ScrollableTable, StackedBarLineChart } from "@/components/ui/charts";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { NumberField } from "@/components/ui/NumberField";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { amortize, fmtBreakEven, pmt } from "./math";
import { mortgageDefaults, useHomeCalcStore } from "./store";
import type { MortgageRow } from "./types";

export function MortgageView() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { mortgage, updateMortgage, loadProfileInputs } = useHomeCalcStore();
  const result = useMemo(() => amortize(mortgage), [mortgage]);
  const principal = Math.max(0, mortgage.homePrice - mortgage.downPayment);
  const monthlyPayment = pmt(principal, mortgage.interestRate, mortgage.loanTermYears);

  return (
    <View style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mortgage</Text>
        <Pressable onPress={() => loadProfileInputs({ mortgage: mortgageDefaults })} style={styles.iconText}>
          <RotateCcw size={14} color={colors.primary} />
          <Text style={styles.link}>Reset defaults</Text>
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introTitle}>About this calculator</Text>
        <Text style={styles.introBody}>
          Shows principal & interest only — no taxes, insurance, or PMI. Try adding an extra monthly payment to see how much interest you save and how many years you shave off your loan.
        </Text>
      </View>

      <View style={styles.row}>
        <StatCard label="Monthly P&I" value={formatCurrency(monthlyPayment)} sub="principal + interest" highlight />
        <StatCard label="Total interest" value={formatCurrency(result.totalInterest, true)} sub="cost of borrowing" />
      </View>
      <View style={styles.row}>
        <StatCard label="Total cost" value={formatCurrency(principal + result.totalInterest, true)} sub="loan + interest" />
        <StatCard label="Payoff" value={fmtBreakEven(result.totalMonths)} sub={`${result.totalMonths} months`} />
      </View>

      {(() => {
        const points = result.rows.map((row) => ({ x: row.year, principal: row.principalPaid, interest: row.interestPaid, balance: row.balance }));
        return (
          <ExpandableCard
            title="Amortization over time"
            subtitle="Bars split principal vs. interest each year; the line tracks your remaining balance."
            compact={<StackedBarLineChart points={points} compact />}
            expanded={<StackedBarLineChart points={points} height={420} />}
          />
        );
      })()}

      <MortgageTable rows={result.rows} />

      <SectionCard title="Core numbers" icon={<Home size={16} color={colors.primary} />} defaultOpen>
        <NumberField
          label="Home price"
          value={mortgage.homePrice}
          onChange={(homePrice) => updateMortgage({ homePrice })}
          prefix="$"
          format="currency"
          hint="Total purchase price of the home"
        />
        <NumberField
          label="Down payment"
          value={mortgage.downPayment}
          onChange={(downPayment) => updateMortgage({ downPayment })}
          prefix="$"
          format="currency"
          hint="Upfront cash — 20% of price avoids PMI"
        />
        <NumberField
          label="Interest rate"
          value={mortgage.interestRate / 100}
          onChange={(value) => updateMortgage({ interestRate: value * 100 })}
          format="percent"
          suffix="%"
          hint="Fixed rate quoted by your lender"
        />
        <NumberField
          label="Loan term"
          value={mortgage.loanTermYears}
          onChange={(loanTermYears) => updateMortgage({ loanTermYears })}
          suffix="years"
          hint="30yr = lower payment; 15yr = less total interest"
        />
      </SectionCard>

      <SectionCard title="Payment options">
        <NumberField
          label="Extra monthly payment"
          value={mortgage.extraMonthlyPayment}
          onChange={(extraMonthlyPayment) => updateMortgage({ extraMonthlyPayment })}
          prefix="$"
          format="currency"
          hint="Goes straight to principal — cuts years off your loan"
        />
        <NumberField
          label="Years to show"
          value={mortgage.displayYears}
          onChange={(displayYears) => updateMortgage({ displayYears: Math.max(1, Math.floor(displayYears)) })}
          suffix="years"
          hint="Limit table rows to this many years"
        />
      </SectionCard>

      <View style={styles.glossary}>
        <Text style={styles.glossaryTitle}>How to read the table</Text>
        <Text style={styles.glossaryBody}>
          <Text style={styles.bold}>Principal</Text> builds equity. <Text style={styles.bold}>Interest</Text> is lender cost — highest in year 1, shrinks every year. <Text style={styles.bold}>Cum. Interest</Text> is the running total. <Text style={styles.bold}>Equity %</Text> is how much of the original loan you've paid off.
        </Text>
        <Text style={styles.glossaryBody}>
          Tip: In early years most of your payment is interest. Extra payments go straight to principal and can shave years off the loan.
        </Text>
      </View>
    </View>
  );
}

function MortgageTable({ rows }: { rows: MortgageRow[] }) {
  const { colors } = useTheme();
  return (
    <ScrollableTable<MortgageRow>
      rows={rows}
      stickyLabel="Year"
      stickyValue={(row) => String(row.year)}
      title="Amortization schedule"
      subtitle={`${rows.length} years · swipe horizontally for every column`}
      expandable
      previewRows={5}
      columns={[
        { label: "Payment", render: (row) => formatCurrency(row.annualPayment, true) },
        { label: "Principal", render: (row) => formatCurrency(row.principalPaid, true), color: () => colors.success },
        { label: "Interest", render: (row) => formatCurrency(row.interestPaid, true), color: () => colors.destructive },
        { label: "Cum. Int", render: (row) => formatCurrency(row.cumInterest, true) },
        { label: "Balance", render: (row) => formatCurrency(row.balance, true) },
        { label: "Equity", render: (row) => `${row.equityPct.toFixed(0)}%`, color: () => colors.primary }
      ]}
    />
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12, marginTop: 16 },
  iconText: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: colors.primary, fontWeight: "900" },
  row: { flexDirection: "row", gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  intro: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated, borderRadius: 12, padding: 12, gap: 4 },
  introTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  introBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  glossary: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 12, gap: 8 },
  glossaryTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  glossaryBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  bold: { color: colors.foreground, fontWeight: "900" }
});
