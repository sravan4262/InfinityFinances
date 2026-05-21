export interface BreakEvenInputs {
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  loanTermYears: number;
  initialClosingCosts: number;
  annualAppreciation: number;
  sellingCostPercent: number;
  annualPropertyTax: number;
  annualInsurance: number;
  annualMaintenance: number;
  monthlyHOA: number;
  maxYears: number;
  monthlyRentSaved: number;
  annualRentGrowth: number;
  opportunityCostRate: number;
  annualTaxBenefit: number;
}

export interface MortgageInputs {
  homePrice: number;
  downPayment: number;
  interestRate: number;
  loanTermYears: number;
  extraMonthlyPayment: number;
  displayYears: number;
}

export interface AffordabilityInputs {
  annualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  annualInsurance: number;
  monthlyHOA: number;
}

export interface BreakEvenRow {
  year: number;
  salePrice: number;
  loanBalance: number;
  sellingCosts: number;
  interestPaid: number;
  otherCosts: number;
  cashBack: number;
  rentSaved: number;
  oppCost: number;
  taxBenefit: number;
  basicNet: number;
  advancedNet: number;
}

export interface MortgageRow {
  year: number;
  annualPayment: number;
  principalPaid: number;
  interestPaid: number;
  cumInterest: number;
  balance: number;
  equityPct: number;
}

export interface AffordabilityScenario {
  label: string;
  frontDTI: number;
  backDTI: number;
  maxPITI: number;
  maxPI: number;
  maxLoan: number;
  homePrice: number;
  monthlyTax: number;
  monthlyIns: number;
  monthlyHOA: number;
  dtiF: number;
  dtiB: number;
}
