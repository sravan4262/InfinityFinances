import { View } from "react-native";
import { Users } from "lucide-react-native";
import { NumberField } from "@/components/ui/NumberField";
import { SectionCard } from "@/components/ui/SectionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireInputs } from "@/lib/engine/types";
import { StepHeader } from "./shared";
import type { AdvancedWizardErrors } from "./validation";

export function StepYou({
  inputs,
  updateInputs,
  errors,
  clearErrors,
  includeSpouse,
  setIncludeSpouse,
  spouseInputs,
  updateSpouseInputs
}: {
  inputs: FireInputs;
  updateInputs: (patch: Partial<FireInputs>) => void;
  errors: AdvancedWizardErrors;
  clearErrors: () => void;
  includeSpouse: boolean;
  setIncludeSpouse: (value: boolean) => void;
  spouseInputs: FireInputs;
  updateSpouseInputs: (patch: Partial<FireInputs>) => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <StepHeader title="About you" body="Your timeline sets the foundation for every later assumption." />
      <NumberField label="Current age" value={inputs.currentAge} onChange={(currentAge) => { updateInputs({ currentAge }); clearErrors(); }} min={18} max={80} suffix="years" error={errors.currentAge} />
      <NumberField label="Target retirement age" value={inputs.retirementAge} onChange={(retirementAge) => { updateInputs({ retirementAge }); clearErrors(); }} min={inputs.currentAge + 1} max={80} suffix="years" error={errors.retirementAge} />
      <NumberField label="Life expectancy" value={inputs.lifeExpectancy} onChange={(lifeExpectancy) => { updateInputs({ lifeExpectancy }); clearErrors(); }} min={inputs.retirementAge + 1} max={110} suffix="years" error={errors.lifeExpectancy} />
      <SectionCard title="Include spouse / partner" icon={<Users size={16} color={colors.primary} />}>
        <SegmentedControl
          value={includeSpouse ? "yes" : "no"}
          options={[{ label: "No", value: "no" }, { label: "Yes", value: "yes" }]}
          onChange={(value) => setIncludeSpouse(value === "yes")}
        />
        {includeSpouse ? (
          <View style={{ gap: 12 }}>
            <NumberField label="Spouse current age" value={spouseInputs.currentAge} onChange={(currentAge) => { updateSpouseInputs({ currentAge }); clearErrors(); }} suffix="years" error={errors.spouseCurrentAge} />
            <NumberField label="Spouse retirement age" value={spouseInputs.retirementAge} onChange={(retirementAge) => { updateSpouseInputs({ retirementAge }); clearErrors(); }} min={spouseInputs.currentAge + 1} suffix="years" error={errors.spouseRetirementAge} />
            <NumberField label="Spouse life expectancy" value={spouseInputs.lifeExpectancy} onChange={(lifeExpectancy) => { updateSpouseInputs({ lifeExpectancy }); clearErrors(); }} min={spouseInputs.retirementAge + 1} suffix="years" error={errors.spouseLifeExpectancy} />
          </View>
        ) : null}
      </SectionCard>
    </>
  );
}
