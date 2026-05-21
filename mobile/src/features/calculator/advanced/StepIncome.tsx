import { Pressable, Text, View } from "react-native";
import { NumberField } from "@/components/ui/NumberField";
import { SectionCard } from "@/components/ui/SectionCard";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/ThemeProvider";
import { currentMonthStr } from "@/lib/store";
import type { FireInputs } from "@/lib/engine/types";
import { makeStepStyles, PersonToggle, StepHeader, type Person } from "./shared";
import type { AdvancedWizardErrors } from "./validation";

export function StepIncome({
  activeInputs,
  activeUpdate,
  currencySymbol,
  includeSpouse,
  person,
  setPerson,
  errors,
  clearErrors
}: {
  activeInputs: FireInputs;
  activeUpdate: (patch: Partial<FireInputs>) => void;
  currencySymbol: string;
  includeSpouse: boolean;
  person: Person;
  setPerson: (value: Person) => void;
  errors: AdvancedWizardErrors;
  clearErrors: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStepStyles(colors);
  const savingsStreams = activeInputs.savingsStreams ?? [];

  const addSavingsStream = () => activeUpdate({
    savingsStreams: [
      ...savingsStreams,
      { label: `Stream ${savingsStreams.length + 1}`, monthlyAmount: 500, annualIncreaseRate: 0.03, startDate: currentMonthStr(), endDate: "" }
    ]
  });
  const updateSavingsStream = (index: number, patch: Partial<(typeof savingsStreams)[number]>) =>
    activeUpdate({ savingsStreams: savingsStreams.map((stream, i) => i === index ? { ...stream, ...patch } : stream) });
  const removeSavingsStream = (index: number) =>
    activeUpdate({ savingsStreams: savingsStreams.filter((_, i) => i !== index) });

  return (
    <>
      <StepHeader title="Income & spending" body="Savings rate is the strongest lever in the model." />
      {includeSpouse ? <PersonToggle value={person} onChange={setPerson} /> : null}
      <NumberField label="Annual gross income" value={activeInputs.grossIncome} onChange={(grossIncome) => activeUpdate({ grossIncome })} prefix={currencySymbol} format="currency" />
      <NumberField label="Annual after-tax income" value={activeInputs.afterTaxIncome} onChange={(afterTaxIncome) => { activeUpdate({ afterTaxIncome }); clearErrors(); }} prefix={currencySymbol} format="currency" error={person === "you" ? errors.afterTaxIncome : undefined} />
      <NumberField label="Annual spending" value={activeInputs.currentSpending} onChange={(currentSpending) => { activeUpdate({ currentSpending }); clearErrors(); }} prefix={currencySymbol} format="currency" error={person === "you" ? errors.currentSpending : undefined} />
      <NumberField label="Salary growth rate" value={activeInputs.salaryGrowthRate} onChange={(salaryGrowthRate) => activeUpdate({ salaryGrowthRate })} format="percent" suffix="%/yr" />
      <SectionCard title="Additional savings streams">
        <Text style={styles.helper}>Add recurring savings that sit on top of income minus spending.</Text>
        {savingsStreams.map((stream, index) => (
          <View key={index} style={styles.itemCard}>
            <TextField label="Stream name" value={stream.label} onChange={(label) => updateSavingsStream(index, { label })} />
            <NumberField label="Monthly amount" value={stream.monthlyAmount} onChange={(monthlyAmount) => updateSavingsStream(index, { monthlyAmount })} prefix={currencySymbol} format="currency" />
            <NumberField label="Annual increase" value={stream.annualIncreaseRate} onChange={(annualIncreaseRate) => updateSavingsStream(index, { annualIncreaseRate })} format="percent" suffix="%/yr" />
            <Pressable onPress={() => removeSavingsStream(index)}>
              <Text style={styles.removeText}>Remove stream</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addSavingsStream} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>+ Add savings stream</Text>
        </Pressable>
      </SectionCard>
    </>
  );
}
