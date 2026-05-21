import { Text, View } from "react-native";
import { NumberField } from "@/components/ui/NumberField";
import { SliderField } from "@/components/ui/SliderField";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, FireInputs, FireResults } from "@/lib/engine/types";
import { makeStepStyles, PersonToggle, StepHeader, type Person } from "./shared";
import type { AdvancedWizardErrors } from "./validation";

export function StepGoals({
  activeInputs,
  activeUpdate,
  currency,
  currencySymbol,
  includeSpouse,
  person,
  setPerson,
  errors,
  clearErrors,
  preview,
  showPreview
}: {
  activeInputs: FireInputs;
  activeUpdate: (patch: Partial<FireInputs>) => void;
  currency: FireCurrency;
  currencySymbol: string;
  includeSpouse: boolean;
  person: Person;
  setPerson: (value: Person) => void;
  errors: AdvancedWizardErrors;
  clearErrors: () => void;
  preview: FireResults | null;
  showPreview: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStepStyles(colors);
  return (
    <>
      <StepHeader title="Goals & assumptions" body="This is where your FIRE number becomes explicit." />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Your FIRE number</Text>
        <Text style={styles.heroNumber}>{showPreview && preview ? formatCurrency(preview.fireNumber, false, currency) : "-"}</Text>
      </View>
      {includeSpouse ? <PersonToggle value={person} onChange={setPerson} /> : null}
      <NumberField label="Annual retirement spending" value={activeInputs.retirementSpending} onChange={(retirementSpending) => { activeUpdate({ retirementSpending, monthlyRetirementSalary: retirementSpending / 12 }); clearErrors(); }} prefix={currencySymbol} format="currency" error={person === "you" ? errors.retirementSpending : undefined} />
      <NumberField label="Monthly retirement salary" value={activeInputs.monthlyRetirementSalary ?? activeInputs.retirementSpending / 12} onChange={(monthlyRetirementSalary) => activeUpdate({ monthlyRetirementSalary, retirementSpending: monthlyRetirementSalary * 12 })} prefix={currencySymbol} format="currency" />
      <SliderField label="Withdrawal rate" value={activeInputs.withdrawalRate * 100} display={`${(activeInputs.withdrawalRate * 100).toFixed(1)}%`} min={2} max={6} step={0.1} onChange={(value) => activeUpdate({ withdrawalRate: value / 100 })} />
    </>
  );
}
