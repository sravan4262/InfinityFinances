import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DollarSign, Home, RotateCcw } from "lucide-react-native";
import { ScrollableTable } from "@/components/ui/charts";
import { NumberField } from "@/components/ui/NumberField";
import { ProgressBar } from "@/components/ui/Sparkline";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { calcAllAffordabilityScenarios } from "./math";
import { affordabilityDefaults, useHomeCalcStore } from "./store";
import type { AffordabilityScenario } from "./types";

export function AffordabilityView() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { affordability, updateAffordability, loadProfileInputs } = useHomeCalcStore();
  const scenarios = useMemo(() => calcAllAffordabilityScenarios(affordability), [affordability]);
  const monthlyIncome = affordability.annualIncome / 12;
  const moderateScenario = scenarios.find((scenario) => scenario.label === "Moderate") ?? scenarios[1];

  return (
    <View style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Affordability</Text>
        <Pressable onPress={() => loadProfileInputs({ affordability: affordabilityDefaults })} style={styles.iconText}>
          <RotateCcw size={14} color={colors.primary} />
          <Text style={styles.link}>Reset defaults</Text>
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introTitle}>What is DTI?</Text>
        <Text style={styles.introBody}>
          <Text style={styles.bold}>Debt-to-Income</Text> is your total monthly debt payments divided by gross monthly income. <Text style={styles.bold}>Front-end</Text> covers just the housing payment; <Text style={styles.bold}>back-end</Text> covers housing plus all other debts.
        </Text>
      </View>

      <View style={styles.row}>
        <StatCard
          label="Conservative max"
          value={formatCurrency(scenarios[0]?.homePrice ?? 0, true)}
          sub="28% / 36% DTI"
          highlight
        />
        <StatCard
          label="Moderate max"
          value={formatCurrency(moderateScenario?.homePrice ?? 0, true)}
          sub="31% / 43% DTI"
        />
      </View>
      <View style={styles.row}>
        <StatCard
          label="Aggressive max"
          value={formatCurrency(scenarios[2]?.homePrice ?? 0, true)}
          sub="36% / 50% DTI"
        />
        <StatCard label="Monthly income" value={formatCurrency(monthlyIncome, true)} sub="gross / month" />
      </View>

      {scenarios.map((scenario) => (
        <View key={scenario.label} style={styles.scenarioCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{scenario.label}</Text>
            <Text style={styles.value}>{formatCurrency(scenario.homePrice)}</Text>
          </View>
          <ProgressBar
            value={scenario.dtiB}
            max={0.5}
            color={
              scenario.label === "Conservative"
                ? colors.success
                : scenario.label === "Moderate"
                ? colors.primary
                : colors.destructive
            }
          />
          <Text style={styles.small}>
            Front/back DTI {(scenario.dtiF * 100).toFixed(0)}% / {(scenario.dtiB * 100).toFixed(0)}% · PITI {formatCurrency(scenario.maxPITI)}
          </Text>
        </View>
      ))}

      <AffordabilityTable scenarios={scenarios} />

      {moderateScenario ? (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Monthly payment breakdown — Moderate</Text>
          <ResultRows
            rows={[
              ["P&I", moderateScenario.maxPI],
              ["Property tax", moderateScenario.monthlyTax],
              ["Insurance", moderateScenario.monthlyIns],
              ["HOA", moderateScenario.monthlyHOA],
              ["Total PITI", moderateScenario.maxPITI]
            ]}
          />
          <Text style={styles.small}>
            Front/back DTI {(moderateScenario.dtiF * 100).toFixed(0)}% / {(moderateScenario.dtiB * 100).toFixed(0)}%
          </Text>
        </View>
      ) : null}

      <SectionCard title="Income & debts" icon={<DollarSign size={16} color={colors.primary} />} defaultOpen>
        <Text style={styles.helper}>
          Use total household gross (pre-tax) income. Include every recurring debt payment — car, student, credit card minimums.
        </Text>
        <NumberField
          label="Annual income"
          value={affordability.annualIncome}
          onChange={(annualIncome) => updateAffordability({ annualIncome })}
          prefix="$"
          format="currency"
          hint="Combined pre-tax household income per year"
        />
        <NumberField
          label="Monthly debts"
          value={affordability.monthlyDebts}
          onChange={(monthlyDebts) => updateAffordability({ monthlyDebts })}
          prefix="$"
          format="currency"
          hint="Car, student loans, credit card minimums"
        />
        <NumberField
          label="Down payment"
          value={affordability.downPayment}
          onChange={(downPayment) => updateAffordability({ downPayment })}
          prefix="$"
          format="currency"
          hint="Upfront cash — 20% of price avoids PMI"
        />
      </SectionCard>

      <SectionCard title="Loan assumptions" icon={<Home size={16} color={colors.primary} />}>
        <Text style={styles.helper}>
          From your lender or listing. Property tax varies by county (typically 0.5–2.5%). Insurance is usually $100–250/mo.
        </Text>
        <NumberField
          label="Interest rate"
          value={affordability.interestRate / 100}
          onChange={(value) => updateAffordability({ interestRate: value * 100 })}
          format="percent"
          suffix="%"
          hint="Fixed rate quoted by your lender"
        />
        <NumberField
          label="Loan term"
          value={affordability.loanTermYears}
          onChange={(loanTermYears) => updateAffordability({ loanTermYears })}
          suffix="years"
          hint="30yr = lower payment; 15yr = less total interest"
        />
        <NumberField
          label="Property tax rate"
          value={affordability.propertyTaxRate / 100}
          onChange={(value) => updateAffordability({ propertyTaxRate: value * 100 })}
          format="percent"
          suffix="%/yr"
          hint="Annual tax as % of home price"
        />
        <NumberField
          label="Annual insurance"
          value={affordability.annualInsurance}
          onChange={(annualInsurance) => updateAffordability({ annualInsurance })}
          prefix="$"
          suffix="/yr"
          format="currency"
          hint="Typically $1,200–3,000/yr"
        />
        <NumberField
          label="Monthly HOA"
          value={affordability.monthlyHOA}
          onChange={(monthlyHOA) => updateAffordability({ monthlyHOA })}
          prefix="$"
          format="currency"
          hint="Monthly fee for condos/communities — 0 if none"
        />
      </SectionCard>

      <View style={styles.scenariosCard}>
        <Text style={styles.scenariosTitle}>The three scenarios</Text>
        <Text style={styles.scenarioLine}>
          <Text style={[styles.bold, { color: colors.success }]}>Conservative</Text> <Text style={styles.muted}>— 28/36 rule, widely recommended for first-time buyers.</Text>
        </Text>
        <Text style={styles.scenarioLine}>
          <Text style={[styles.bold, { color: colors.primary }]}>Moderate</Text> <Text style={styles.muted}>— FHA guidelines (31/43), most common approval threshold.</Text>
        </Text>
        <Text style={styles.scenarioLine}>
          <Text style={[styles.bold, { color: colors.destructive }]}>Aggressive</Text> <Text style={styles.muted}>— max most lenders approve (36/50), little cushion.</Text>
        </Text>
        <Text style={styles.scenariosFooter}>
          Lender approval not guaranteed at any DTI. Credit score, employment history, and reserves all affect eligibility.
        </Text>
      </View>
    </View>
  );
}

function ResultRows({ rows }: { rows: [string, number][] }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.listRow}>
          <Text style={styles.listLabel}>{label}</Text>
          <Text style={styles.listValue}>{formatCurrency(value, true)}</Text>
        </View>
      ))}
    </View>
  );
}

function AffordabilityTable({ scenarios }: { scenarios: AffordabilityScenario[] }) {
  const { colors } = useTheme();
  return (
    <ScrollableTable<AffordabilityScenario>
      rows={scenarios}
      stickyLabel="Scenario"
      stickyValue={(row) => row.label}
      title="Scenario comparison"
      subtitle="Swipe horizontally to compare every column."
      expandable
      columns={[
        {
          label: "DTI",
          render: (row) => `${(row.dtiB * 100).toFixed(0)}%`,
          color: (row) =>
            row.label === "Aggressive" ? colors.destructive : row.label === "Conservative" ? colors.success : colors.primary
        },
        { label: "Max PITI", render: (row) => formatCurrency(row.maxPITI, true) },
        { label: "P&I", render: (row) => formatCurrency(row.maxPI, true) },
        { label: "Max Loan", render: (row) => formatCurrency(row.maxLoan, true) },
        { label: "Max Home", render: (row) => formatCurrency(row.homePrice, true) }
      ]}
    />
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  content: { gap: 12, marginTop: 16 },
  iconText: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: colors.primary, fontWeight: "900" },
  listLabel: { color: colors.mutedForeground, fontWeight: "700" },
  listRow: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listValue: { color: colors.foreground, fontWeight: "900", textAlign: "right" },
  row: { flexDirection: "row", gap: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  scenarioCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  small: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  value: { color: colors.foreground, fontWeight: "900", fontSize: 16 },
  intro: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated, borderRadius: 12, padding: 12, gap: 4 },
  introTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  introBody: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  bold: { color: colors.foreground, fontWeight: "900" },
  helper: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  breakdownCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 12, gap: 6 },
  breakdownTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  scenariosCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, padding: 12, gap: 6 },
  scenariosTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  scenarioLine: { fontSize: 12, lineHeight: 17 },
  muted: { color: colors.mutedForeground },
  scenariosFooter: { color: colors.mutedForeground, fontSize: 11, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }
});
