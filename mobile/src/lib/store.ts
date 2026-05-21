import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateFireMonthly } from "./engine/monthly";
import { mergeInputs } from "./engine/merge";
import type { FireInputs, FireResults } from "./engine/types";
import { defaultFireInputs } from "@/features/calculator/fireDefaults";

export type InputMode = "simple" | "form";
export type WizardStep = 0 | 1 | 2 | 3 | 4;
export type CalculatorView = "overview" | "editor";

export function nextMonthStr(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthStr(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface FireStore {
  inputMode: InputMode;
  calculatorView: CalculatorView;
  setCalculatorView: (view: CalculatorView) => void;
  setInputMode: (mode: InputMode) => void;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  inputs: FireInputs;
  activePlanId: string | null;
  activePlanName: string | null;
  setActivePlan: (id: string, name: string) => void;
  updateInputs: (partial: Partial<FireInputs>) => void;
  loadPlan: (id: string, name: string, inputs: FireInputs) => void;
  clearActivePlan: () => void;
  resetInputs: () => void;
  startNewPlan: () => void;
  reset: () => void;
  includeSpouse: boolean;
  setIncludeSpouse: (value: boolean) => void;
  spouseInputs: FireInputs;
  updateSpouseInputs: (partial: Partial<FireInputs>) => void;
  spouseResults: FireResults | null;
  unifiedResults: FireResults | null;
  results: FireResults | null;
  hasResults: boolean;
  calculate: () => void;
  editInputs: () => void;
}

export const useFireStore = create<FireStore>()(
  persist(
    (set, get) => ({
      inputMode: "simple",
      calculatorView: "overview",
      setCalculatorView: (calculatorView) => set({ calculatorView }),
      setInputMode: (inputMode) => set({ inputMode }),
      wizardStep: 0,
      setWizardStep: (wizardStep) => set({ wizardStep }),
      inputs: defaultFireInputs,
      activePlanId: null,
      activePlanName: null,
      setActivePlan: (id, name) => set({ activePlanId: id, activePlanName: name }),
      updateInputs: (partial) => set((state) => ({ inputs: { ...state.inputs, ...partial }, hasResults: false })),
      resetInputs: () => set({
        inputs: defaultFireInputs,
        spouseInputs: defaultFireInputs,
        includeSpouse: false,
        results: null,
        spouseResults: null,
        unifiedResults: null,
        hasResults: false,
        wizardStep: 0
        ,activePlanId: null,
        activePlanName: null
        ,calculatorView: "overview"
      }),
      startNewPlan: () => set({
        inputs: defaultFireInputs,
        spouseInputs: defaultFireInputs,
        includeSpouse: false,
        results: null,
        spouseResults: null,
        unifiedResults: null,
        hasResults: false,
        wizardStep: 0,
        activePlanId: null,
        activePlanName: null,
        calculatorView: "editor"
      }),
      loadPlan: (id, name, inputs) => set({
        inputs,
        activePlanId: id,
        activePlanName: name,
        results: null,
        spouseResults: null,
        unifiedResults: null,
        hasResults: false,
        calculatorView: "editor"
      }),
      clearActivePlan: () => set({ activePlanId: null, activePlanName: null }),
      reset: () => set({
        inputMode: "simple",
        calculatorView: "overview",
        wizardStep: 0,
        inputs: defaultFireInputs,
        spouseInputs: defaultFireInputs,
        includeSpouse: false,
        activePlanId: null,
        activePlanName: null,
        results: null,
        spouseResults: null,
        unifiedResults: null,
        hasResults: false
      }),
      includeSpouse: false,
      setIncludeSpouse: (includeSpouse) => set({ includeSpouse }),
      spouseInputs: defaultFireInputs,
      updateSpouseInputs: (partial) => set((state) => ({ spouseInputs: { ...state.spouseInputs, ...partial } })),
      spouseResults: null,
      unifiedResults: null,
      results: null,
      hasResults: false,
      calculate: () => {
        const { inputs, includeSpouse, spouseInputs } = get();
        const results = calculateFireMonthly(inputs);
        if (!includeSpouse) return set({ results, spouseResults: null, unifiedResults: null, hasResults: true });
        const spouseCalcInputs: FireInputs = {
          ...spouseInputs,
          inflationRate: spouseInputs.inflationRate || inputs.inflationRate,
          withdrawalRate: spouseInputs.withdrawalRate || inputs.withdrawalRate,
          retirementSpending: spouseInputs.retirementSpending || inputs.retirementSpending
        };
        set({
          results,
          spouseResults: calculateFireMonthly(spouseCalcInputs),
          unifiedResults: calculateFireMonthly(mergeInputs(inputs, spouseCalcInputs)),
          hasResults: true
        });
      },
      editInputs: () => set({ hasResults: false, calculatorView: "editor" })
    }),
    {
      name: "fire-calculator",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ inputs, spouseInputs, includeSpouse, inputMode, wizardStep }) => ({
        inputs,
        spouseInputs,
        includeSpouse,
        inputMode,
        wizardStep
      })
    }
  )
);
