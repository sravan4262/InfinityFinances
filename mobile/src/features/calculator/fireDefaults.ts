import type { FireInputs } from "@/lib/engine/types";

export const defaultFireInputs: FireInputs = {
  currency: "USD",
  currentAge: 0,
  retirementAge: 0,
  lifeExpectancy: 90,
  grossIncome: 0,
  afterTaxIncome: 0,
  currentSpending: 0,
  savingsGrowthRate: 0,
  salaryGrowthRate: 0,
  currentPortfolio: 0,
  expectedReturn: 0.07,
  inflationRate: 0.03,
  withdrawalRate: 0.04,
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
  assets: [
    {
      label: "Stocks / Equity",
      value: 0,
      annualReturn: 0.07,
      accountType: "taxable"
    }
  ],
  emis: [],
  savingsStreams: [],
  futureInvestments: [],
  futureExpenses: []
};
