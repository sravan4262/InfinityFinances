"use client";
import { create } from "zustand";
import type { FireInputs, FireResults } from "./engine/types";
import { calculateFireMonthly } from "./engine/monthly";
import { mergeInputs } from "./engine/merge";

export type InputMode = "simple" | "form";
export type WizardStep = 0 | 1 | 2 | 3 | 4;
export type AppTab = "calculator" | "tracker" | "home" | "expense";
export type CalculatorView = "overview" | "editor";

export function nextMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DEFAULT_INPUTS: FireInputs = {
  currency: "USD",
  currentAge: 0,
  retirementAge: 0,
  lifeExpectancy: 0,
  grossIncome: 0,
  afterTaxIncome: 0,
  currentSpending: 0,
  savingsGrowthRate: 0,
  salaryGrowthRate: 0,
  currentPortfolio: 0,
  expectedReturn: 0,
  inflationRate: 0,
  withdrawalRate: 0,
  retirementSpending: 0,
  monthlyRetirementSalary: undefined,
  socialSecurityBenefit: 0,
  socialSecurityAge: 0,
  pensionBenefit: 0,
  pensionStartAge: 0,
  effectiveTaxRateAccumulation: 0,
  effectiveTaxRateRetirement: 0,
  healthcarePremium: 0,
  healthcareInflation: 0,
  medicareAge: 0,
  children: [],
  oneTimeEvents: [],
  // Phase 2
  assets: [
    { label: "Stocks / Equity", value: 0, annualReturn: 0.10, accountType: "taxable" as const },
  ],
  emis: [],
  // Phase 3
  savingsStreams: [],
  futureInvestments: [],
  futureExpenses: [],
};

interface FireStore {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  calculatorView: CalculatorView;
  setCalculatorView: (view: CalculatorView) => void;

  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;

  inputs: FireInputs;
  activePlanId: string | null;
  activePlanName: string | null;
  updateInputs: (partial: Partial<FireInputs>) => void;
  loadPlan: (id: string, name: string, inputs: FireInputs) => void;
  clearActivePlan: () => void;
  resetInputs: () => void;
  startNewPlan: () => void;
  reset: () => void;

  // Spouse
  includeSpouse: boolean;
  setIncludeSpouse: (v: boolean) => void;
  spouseInputs: FireInputs;
  updateSpouseInputs: (partial: Partial<FireInputs>) => void;
  spouseResults: FireResults | null;
  unifiedResults: FireResults | null;

  results: FireResults | null;
  hasResults: boolean;
  calculate: () => void;
  editInputs: () => void;

  previewPerson: "you" | "spouse";
  setPreviewPerson: (p: "you" | "spouse") => void;

  chatCollectedFields: Set<string>;
  markChatField: (field: string) => void;
  chatReady: boolean;
}

export const useFireStore = create<FireStore>((set, get) => ({
  activeTab: "calculator",
  setActiveTab: (tab) => set({ activeTab: tab }),
  calculatorView: "overview",
  setCalculatorView: (calculatorView) => set({ calculatorView }),

  inputMode: "simple",
  setInputMode: (mode) => set({ inputMode: mode }),

  wizardStep: 0,
  setWizardStep: (step) => set({ wizardStep: step }),

  inputs: DEFAULT_INPUTS,
  activePlanId: null,
  activePlanName: null,
  updateInputs: (partial) => {
    set((s) => ({ inputs: { ...s.inputs, ...partial } }));
  },
  resetInputs: () => set({
    inputs: DEFAULT_INPUTS,
    spouseInputs: DEFAULT_INPUTS,
    includeSpouse: false,
    results: null,
    spouseResults: null,
    unifiedResults: null,
    hasResults: false,
    wizardStep: 0,
    activePlanId: null,
    activePlanName: null,
    calculatorView: "overview",
  }),
  startNewPlan: () => set({
    inputs: DEFAULT_INPUTS,
    spouseInputs: DEFAULT_INPUTS,
    includeSpouse: false,
    results: null,
    spouseResults: null,
    unifiedResults: null,
    hasResults: false,
    wizardStep: 0,
    activePlanId: null,
    activePlanName: null,
    calculatorView: "editor",
  }),
  loadPlan: (id, name, inputs) => set({
    inputs,
    activePlanId: id,
    activePlanName: name,
    results: null,
    spouseResults: null,
    unifiedResults: null,
    hasResults: false,
    calculatorView: "editor",
  }),
  clearActivePlan: () => set({ activePlanId: null, activePlanName: null }),
  reset: () => set({
    activeTab: "calculator",
    calculatorView: "overview",
    inputMode: "simple",
    wizardStep: 0,
    inputs: DEFAULT_INPUTS,
    spouseInputs: DEFAULT_INPUTS,
    includeSpouse: false,
    activePlanId: null,
    activePlanName: null,
    results: null,
    spouseResults: null,
    unifiedResults: null,
    hasResults: false,
    previewPerson: "you",
    chatCollectedFields: new Set(),
    chatReady: false,
  }),

  // Spouse state
  includeSpouse: false,
  setIncludeSpouse: (v) => set({ includeSpouse: v }),
  spouseInputs: DEFAULT_INPUTS,
  updateSpouseInputs: (partial) => {
    set((s) => ({ spouseInputs: { ...s.spouseInputs, ...partial } }));
  },
  spouseResults: null,
  unifiedResults: null,

  results: null,
  hasResults: false,
  calculate: () => {
    const { inputs, includeSpouse, spouseInputs } = get();
    const results = calculateFireMonthly(inputs);
    if (includeSpouse) {
      // For spouse calc: inherit shared rates from primary if spouse has defaults
      const spouseCalcInputs: FireInputs = {
        ...spouseInputs,
        inflationRate: spouseInputs.inflationRate || inputs.inflationRate,
        withdrawalRate: spouseInputs.withdrawalRate || inputs.withdrawalRate,
        retirementSpending: spouseInputs.retirementSpending || inputs.retirementSpending,
      };
      const spouseResults = calculateFireMonthly(spouseCalcInputs);
      const unified = mergeInputs(inputs, spouseCalcInputs);
      const unifiedResults = calculateFireMonthly(unified);
      set({ results, spouseResults, unifiedResults, hasResults: true });
    } else {
      set({ results, spouseResults: null, unifiedResults: null, hasResults: true });
    }
  },
  editInputs: () => set({ hasResults: false, calculatorView: "editor" }),

  previewPerson: "you",
  setPreviewPerson: (p) => set({ previewPerson: p }),

  chatCollectedFields: new Set(),
  markChatField: (field) => {
    set((s) => {
      const next = new Set(s.chatCollectedFields);
      next.add(field);
      const requiredFields = [
        "currency", "currentAge", "retirementAge", "afterTaxIncome",
        "currentSpending", "currentPortfolio", "retirementSpending",
        "expectedReturn",
      ];
      const chatReady = requiredFields.every((f) => next.has(f));
      return { chatCollectedFields: next, chatReady };
    });
  },
  chatReady: false,
}));
