import { Text, View } from "react-native";
import { GraduationCap, HeartPulse, Landmark, ShoppingBag } from "lucide-react-native";
import { NumberField } from "@/components/ui/NumberField";
import { SectionCard } from "@/components/ui/SectionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/ThemeProvider";
import { currentMonthStr, nextMonthStr } from "@/lib/store";
import type { FireInputs } from "@/lib/engine/types";
import { AddButton, makeStepStyles, PersonToggle, RemoveButton, StepHeader, type Person } from "./shared";

export function StepAdvanced({
  activeInputs,
  activeUpdate,
  currencySymbol,
  includeSpouse,
  person,
  setPerson
}: {
  activeInputs: FireInputs;
  activeUpdate: (patch: Partial<FireInputs>) => void;
  currencySymbol: string;
  includeSpouse: boolean;
  person: Person;
  setPerson: (value: Person) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStepStyles(colors);
  const emis = activeInputs.emis ?? [];
  const futureExpenses = activeInputs.futureExpenses ?? [];
  const futureInvestments = activeInputs.futureInvestments ?? [];
  const children = activeInputs.children ?? [];

  const addEmi = () => activeUpdate({ emis: [...emis, { label: `Loan ${emis.length + 1}`, monthlyAmount: 0, endDate: nextMonthStr(), redirectToSavings: false }] });
  const updateEmi = (index: number, patch: Partial<(typeof emis)[number]>) => activeUpdate({ emis: emis.map((emi, i) => i === index ? { ...emi, ...patch } : emi) });
  const removeEmi = (index: number) => activeUpdate({ emis: emis.filter((_, i) => i !== index) });

  const addFutureExpense = () => activeUpdate({ futureExpenses: [...futureExpenses, { label: "Expense", monthlyAmount: 500, startDate: currentMonthStr(), endDate: "" }] });
  const updateFutureExpense = (index: number, patch: Partial<(typeof futureExpenses)[number]>) => activeUpdate({ futureExpenses: futureExpenses.map((expense, i) => i === index ? { ...expense, ...patch } : expense) });
  const removeFutureExpense = (index: number) => activeUpdate({ futureExpenses: futureExpenses.filter((_, i) => i !== index) });

  const addFutureInvestment = () => activeUpdate({ futureInvestments: [...futureInvestments, { label: "Future purchase", purchaseDate: nextMonthStr(), investmentValue: 300000, annualReturn: 0.07, downPayment: 60000, deductDownPayment: true, emiAmount: 1500, emiStartDate: nextMonthStr(), emiEndDate: "", deductEmiFromSavings: true }] });
  const updateFutureInvestment = (index: number, patch: Partial<(typeof futureInvestments)[number]>) => activeUpdate({ futureInvestments: futureInvestments.map((investment, i) => i === index ? { ...investment, ...patch } : investment) });
  const removeFutureInvestment = (index: number) => activeUpdate({ futureInvestments: futureInvestments.filter((_, i) => i !== index) });

  const addChild = () => activeUpdate({ children: [...children, { label: `Child ${children.length + 1}`, currentAge: 5, educationStartAge: 18, educationEndAge: 22, annualCostToday: 30000, educationInflation: 0.05, monthlyLivingExpenses: 0, livingEndAge: 22, oneTimeExpenses: [] }] });
  const updateChild = (index: number, patch: Partial<(typeof children)[number]>) => activeUpdate({ children: children.map((child, i) => i === index ? { ...child, ...patch } : child) });
  const removeChild = (index: number) => activeUpdate({ children: children.filter((_, i) => i !== index) });

  return (
    <>
      <StepHeader title="Advanced inputs" body="Optional modifiers that change retirement cash flow." />
      {includeSpouse ? <PersonToggle value={person} onChange={setPerson} /> : null}

      <SectionCard title="Retirement income" icon={<Landmark size={16} color={colors.primary} />} defaultOpen>
        <NumberField label="Social security / NPS annual benefit" value={activeInputs.socialSecurityBenefit ?? 0} onChange={(socialSecurityBenefit) => activeUpdate({ socialSecurityBenefit })} prefix={currencySymbol} format="currency" />
        <NumberField label="Social security / NPS start age" value={activeInputs.socialSecurityAge ?? 67} onChange={(socialSecurityAge) => activeUpdate({ socialSecurityAge })} suffix="years" />
        <NumberField label="Pension annual benefit" value={activeInputs.pensionBenefit ?? 0} onChange={(pensionBenefit) => activeUpdate({ pensionBenefit })} prefix={currencySymbol} format="currency" />
        <NumberField label="Pension start age" value={activeInputs.pensionStartAge ?? 65} onChange={(pensionStartAge) => activeUpdate({ pensionStartAge })} suffix="years" />
      </SectionCard>

      <SectionCard title="EMIs & debts" icon={<ShoppingBag size={16} color={colors.primary} />}>
        <Text style={styles.helper}>Active EMIs reduce savings. Redirecting freed payments increases savings after payoff.</Text>
        {emis.map((emi, index) => (
          <View key={index} style={styles.itemCard}>
            <TextField label="Loan label" value={emi.label} onChange={(label) => updateEmi(index, { label })} />
            <NumberField label="Monthly EMI" value={emi.monthlyAmount} onChange={(monthlyAmount) => updateEmi(index, { monthlyAmount })} prefix={currencySymbol} format="currency" />
            <TextField label="End date" value={emi.endDate} onChange={(endDate) => updateEmi(index, { endDate })} placeholder="YYYY-MM" />
            <SegmentedControl value={emi.redirectToSavings ? "yes" : "no"} options={[{ label: "Keep freed cash", value: "no" }, { label: "Redirect to savings", value: "yes" }]} onChange={(value) => updateEmi(index, { redirectToSavings: value === "yes" })} />
            <RemoveButton onPress={() => removeEmi(index)} />
          </View>
        ))}
        <AddButton label="Add EMI" onPress={addEmi} />
      </SectionCard>

      <SectionCard title="Future expenses" icon={<ShoppingBag size={16} color={colors.primary} />}>
        <Text style={styles.helper}>Date-gated recurring costs that reduce savings while active.</Text>
        {futureExpenses.map((expense, index) => (
          <View key={index} style={styles.itemCard}>
            <TextField label="Expense label" value={expense.label} onChange={(label) => updateFutureExpense(index, { label })} />
            <NumberField label="Monthly amount" value={expense.monthlyAmount} onChange={(monthlyAmount) => updateFutureExpense(index, { monthlyAmount })} prefix={currencySymbol} format="currency" />
            <TextField label="Start date" value={expense.startDate} onChange={(startDate) => updateFutureExpense(index, { startDate })} placeholder="YYYY-MM" />
            <TextField label="End date" value={expense.endDate} onChange={(endDate) => updateFutureExpense(index, { endDate })} placeholder="YYYY-MM" />
            <RemoveButton onPress={() => removeFutureExpense(index)} />
          </View>
        ))}
        <AddButton label="Add future expense" onPress={addFutureExpense} />
      </SectionCard>

      <SectionCard title="Future investments / purchases" icon={<Landmark size={16} color={colors.primary} />}>
        <Text style={styles.helper}>Homes, properties, or major future investments that affect net worth and savings.</Text>
        {futureInvestments.map((investment, index) => (
          <View key={index} style={styles.itemCard}>
            <TextField label="Investment label" value={investment.label} onChange={(label) => updateFutureInvestment(index, { label })} />
            <TextField label="Purchase date" value={investment.purchaseDate} onChange={(purchaseDate) => updateFutureInvestment(index, { purchaseDate })} placeholder="YYYY-MM" />
            <NumberField label="Investment value" value={investment.investmentValue} onChange={(investmentValue) => updateFutureInvestment(index, { investmentValue })} prefix={currencySymbol} format="currency" />
            <NumberField label="Annual return" value={investment.annualReturn} onChange={(annualReturn) => updateFutureInvestment(index, { annualReturn })} format="percent" suffix="%/yr" />
            <NumberField label="Down payment" value={investment.downPayment} onChange={(downPayment) => updateFutureInvestment(index, { downPayment })} prefix={currencySymbol} format="currency" />
            <SegmentedControl value={investment.deductDownPayment ? "yes" : "no"} options={[{ label: "Keep cash", value: "no" }, { label: "Deduct down payment", value: "yes" }]} onChange={(value) => updateFutureInvestment(index, { deductDownPayment: value === "yes" })} />
            <NumberField label="EMI amount" value={investment.emiAmount} onChange={(emiAmount) => updateFutureInvestment(index, { emiAmount })} prefix={currencySymbol} format="currency" />
            <TextField label="EMI start" value={investment.emiStartDate} onChange={(emiStartDate) => updateFutureInvestment(index, { emiStartDate })} placeholder="YYYY-MM" />
            <TextField label="EMI end" value={investment.emiEndDate} onChange={(emiEndDate) => updateFutureInvestment(index, { emiEndDate })} placeholder="YYYY-MM" />
            <SegmentedControl value={investment.deductEmiFromSavings ? "yes" : "no"} options={[{ label: "Ignore EMI", value: "no" }, { label: "Deduct EMI", value: "yes" }]} onChange={(value) => updateFutureInvestment(index, { deductEmiFromSavings: value === "yes" })} />
            <RemoveButton onPress={() => removeFutureInvestment(index)} />
          </View>
        ))}
        <AddButton label="Add future investment" onPress={addFutureInvestment} />
      </SectionCard>

      <SectionCard title="Children / dependents" icon={<GraduationCap size={16} color={colors.primary} />}>
        <Text style={styles.helper}>Education and dependent costs are included in the projection.</Text>
        {children.map((child, index) => (
          <View key={index} style={styles.itemCard}>
            <TextField label="Dependent label" value={child.label} onChange={(label) => updateChild(index, { label })} />
            <NumberField label="Current age" value={child.currentAge} onChange={(currentAge) => updateChild(index, { currentAge })} suffix="years" />
            <NumberField label="Education start age" value={child.educationStartAge} onChange={(educationStartAge) => updateChild(index, { educationStartAge })} suffix="years" />
            <NumberField label="Education end age" value={child.educationEndAge} onChange={(educationEndAge) => updateChild(index, { educationEndAge })} suffix="years" />
            <NumberField label="Annual cost today" value={child.annualCostToday} onChange={(annualCostToday) => updateChild(index, { annualCostToday })} prefix={currencySymbol} format="currency" />
            <NumberField label="Education inflation" value={child.educationInflation} onChange={(educationInflation) => updateChild(index, { educationInflation })} format="percent" suffix="%/yr" />
            <NumberField label="Monthly living expenses" value={child.monthlyLivingExpenses ?? 0} onChange={(monthlyLivingExpenses) => updateChild(index, { monthlyLivingExpenses })} prefix={currencySymbol} format="currency" />
            <NumberField label="Living expense end age" value={child.livingEndAge ?? child.educationEndAge} onChange={(livingEndAge) => updateChild(index, { livingEndAge })} suffix="years" />
            <RemoveButton onPress={() => removeChild(index)} />
          </View>
        ))}
        <AddButton label="Add dependent" onPress={addChild} />
      </SectionCard>

      <SectionCard title="Healthcare & taxes" icon={<HeartPulse size={16} color={colors.primary} />}>
        <NumberField label="Annual healthcare premium" value={activeInputs.healthcarePremium ?? 0} onChange={(healthcarePremium) => activeUpdate({ healthcarePremium })} prefix={currencySymbol} format="currency" />
        <NumberField label="Healthcare inflation" value={activeInputs.healthcareInflation ?? 0.05} onChange={(healthcareInflation) => activeUpdate({ healthcareInflation })} format="percent" suffix="%/yr" />
        <NumberField label="Medicare age" value={activeInputs.medicareAge ?? 65} onChange={(medicareAge) => activeUpdate({ medicareAge })} suffix="years" />
        <NumberField label="Accumulation tax rate" value={activeInputs.effectiveTaxRateAccumulation ?? 0} onChange={(effectiveTaxRateAccumulation) => activeUpdate({ effectiveTaxRateAccumulation })} format="percent" suffix="%" />
        <NumberField label="Retirement tax rate" value={activeInputs.effectiveTaxRateRetirement ?? 0} onChange={(effectiveTaxRateRetirement) => activeUpdate({ effectiveTaxRateRetirement })} format="percent" suffix="%" />
        <NumberField label="Roth conversion ladder" value={activeInputs.rothConversionAnnual ?? 0} onChange={(rothConversionAnnual) => activeUpdate({ rothConversionAnnual })} prefix={currencySymbol} format="currency" hint="Annual traditional-to-Roth conversion during accumulation." />
      </SectionCard>
    </>
  );
}
