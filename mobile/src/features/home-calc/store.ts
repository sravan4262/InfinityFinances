import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AffordabilityInputs, BreakEvenInputs, MortgageInputs } from "./types";

export const breakDefaults: BreakEvenInputs = { purchasePrice:600000,downPayment:120000,interestRate:6.5,loanTermYears:30,initialClosingCosts:12000,annualAppreciation:3,sellingCostPercent:6,annualPropertyTax:7200,annualInsurance:2400,annualMaintenance:6000,monthlyHOA:0,maxYears:15,monthlyRentSaved:2500,annualRentGrowth:3,opportunityCostRate:7,annualTaxBenefit:0 };
export const mortgageDefaults: MortgageInputs = { homePrice:600000,downPayment:120000,interestRate:6.5,loanTermYears:30,extraMonthlyPayment:0,displayYears:30 };
export const affordabilityDefaults: AffordabilityInputs = { annualIncome:120000,monthlyDebts:500,downPayment:60000,interestRate:6.5,loanTermYears:30,propertyTaxRate:1.2,annualInsurance:2400,monthlyHOA:0 };

interface HomeCalcStore {
  breakEven: BreakEvenInputs;
  mortgage: MortgageInputs;
  affordability: AffordabilityInputs;
  updateBreakEven: (patch: Partial<BreakEvenInputs>) => void;
  updateMortgage: (patch: Partial<MortgageInputs>) => void;
  updateAffordability: (patch: Partial<AffordabilityInputs>) => void;
  loadProfileInputs: (inputs: { breakEven?: BreakEvenInputs | null; mortgage?: MortgageInputs | null; affordability?: AffordabilityInputs | null }) => void;
  reset: () => void;
}

export const useHomeCalcStore = create<HomeCalcStore>()(
  persist(
    (set) => ({
      breakEven: breakDefaults,
      mortgage: mortgageDefaults,
      affordability: affordabilityDefaults,
      updateBreakEven: (patch) => set((state) => ({ breakEven: { ...state.breakEven, ...patch } })),
      updateMortgage: (patch) => set((state) => ({ mortgage: { ...state.mortgage, ...patch } })),
      updateAffordability: (patch) => set((state) => ({ affordability: { ...state.affordability, ...patch } })),
      loadProfileInputs: ({ breakEven, mortgage, affordability }) => set((state) => ({
        breakEven: breakEven ?? state.breakEven,
        mortgage: mortgage ?? state.mortgage,
        affordability: affordability ?? state.affordability
      })),
      reset: () => set({
        breakEven: breakDefaults,
        mortgage: mortgageDefaults,
        affordability: affordabilityDefaults
      })
    }),
    {
      name: "home-calculator",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ breakEven, mortgage, affordability }) => ({ breakEven, mortgage, affordability })
    }
  )
);
