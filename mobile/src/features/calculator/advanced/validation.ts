import type { WizardStep } from "@/lib/store";
import type { FireInputs } from "@/lib/engine/types";

export type AdvancedWizardErrors = Record<string, string>;

export function validateAdvancedStep(
  inputs: FireInputs,
  step: WizardStep,
  options?: { includeSpouse?: boolean; spouseInputs?: FireInputs }
): AdvancedWizardErrors {
  const errors: AdvancedWizardErrors = {};
  if (step === 0) {
    if (!inputs.currentAge) errors.currentAge = "Enter your current age";
    if (!inputs.retirementAge) errors.retirementAge = "Enter your target retirement age";
    else if (inputs.retirementAge <= inputs.currentAge) errors.retirementAge = "Must be after current age";
    if (!inputs.lifeExpectancy) errors.lifeExpectancy = "Enter life expectancy";
    else if (inputs.lifeExpectancy <= inputs.retirementAge) errors.lifeExpectancy = "Must be after retirement age";
    if (options?.includeSpouse && options.spouseInputs) {
      const spouse = options.spouseInputs;
      if (!spouse.currentAge) errors.spouseCurrentAge = "Enter spouse's current age";
      if (!spouse.retirementAge) errors.spouseRetirementAge = "Enter spouse's target retirement age";
      else if (spouse.retirementAge <= spouse.currentAge) errors.spouseRetirementAge = "Must be after spouse's current age";
      if (!spouse.lifeExpectancy) errors.spouseLifeExpectancy = "Enter spouse's life expectancy";
      else if (spouse.lifeExpectancy <= spouse.retirementAge) errors.spouseLifeExpectancy = "Must be after spouse's retirement age";
    }
  }
  if (step === 1) {
    if (!inputs.afterTaxIncome) errors.afterTaxIncome = "Enter after-tax income";
    if (!inputs.currentSpending) errors.currentSpending = "Enter annual spending";
  }
  if (step === 4 && !inputs.retirementSpending) errors.retirementSpending = "Enter retirement spending";
  return errors;
}

export function advancedInputsReady(inputs: FireInputs) {
  const monthlyRetirementSpend = inputs.monthlyRetirementSalary ?? (inputs.retirementSpending > 0 ? inputs.retirementSpending / 12 : 0);
  return inputs.currentAge > 0 &&
    inputs.retirementAge > inputs.currentAge &&
    inputs.lifeExpectancy > inputs.retirementAge &&
    monthlyRetirementSpend > 0;
}
