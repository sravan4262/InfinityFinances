import type {
  BreakEvenInputs,
  BreakEvenRow,
  MortgageInputs,
  MortgageRow,
  AffordabilityInputs,
  AffordabilityScenario,
} from "./types";

// ── Core mortgage math ──────────────────────────────────────────────────────

export function pmt(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export function loanBalance(
  principal: number,
  annualRate: number,
  years: number,
  monthsPaid: number
): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (monthsPaid <= 0) return principal;
  if (monthsPaid >= n) return 0;
  if (r === 0) return principal * (1 - monthsPaid / n);
  const p = pmt(principal, annualRate, years);
  return principal * Math.pow(1 + r, monthsPaid) - p * ((Math.pow(1 + r, monthsPaid) - 1) / r);
}

// Cumulative interest only — principal is excluded to avoid double-counting principal paydown
export function cumulativeInterestPaid(
  months: number,
  principal: number,
  annualRate: number,
  years: number
): number {
  if (months <= 0) return 0;
  const p = pmt(principal, annualRate, years);
  const totalPaid = p * months;
  const remaining = loanBalance(principal, annualRate, years, months);
  const principalRepaid = Math.max(0, principal - remaining);
  return Math.max(0, totalPaid - principalRepaid);
}

// ── Break-even helpers ───────────────────────────────────────────────────────

// Year-indexed accumulation of monthly rent with annual compounding growth
export function cumulativeRentSaved(
  months: number,
  baseMonthlyRent: number,
  annualRentGrowth: number
): number {
  let total = 0;
  for (let m = 0; m < months; m++) {
    const yearIndex = Math.floor(m / 12);
    total += baseMonthlyRent * Math.pow(1 + annualRentGrowth / 100, yearIndex);
  }
  return total;
}

// Compound growth on upfront cash that could have been invested elsewhere
export function opportunityCost(
  upfrontCash: number,
  annualRate: number,
  months: number
): number {
  if (upfrontCash <= 0 || annualRate <= 0 || months <= 0) return 0;
  return upfrontCash * (Math.pow(1 + annualRate / 100 / 12, months) - 1);
}

export function computeBreakEvenRow(inputs: BreakEvenInputs, months: number): BreakEvenRow & { monthlyPayment: number } {
  const {
    purchasePrice, downPayment, interestRate, loanTermYears,
    initialClosingCosts, annualAppreciation, sellingCostPercent,
    annualPropertyTax, annualInsurance, annualMaintenance, monthlyHOA,
    monthlyRentSaved, annualRentGrowth, opportunityCostRate, annualTaxBenefit,
  } = inputs;

  const loanAmount = Math.max(0, purchasePrice - downPayment);
  const salePrice = purchasePrice * Math.pow(1 + annualAppreciation / 100, months / 12);
  const remaining = Math.max(0, loanBalance(loanAmount, interestRate, loanTermYears, months));
  const sellingCosts = salePrice * (sellingCostPercent / 100);
  const cashBack = salePrice - sellingCosts - remaining;
  const interestPaid = cumulativeInterestPaid(months, loanAmount, interestRate, loanTermYears);
  const otherCosts =
    ((annualPropertyTax + annualInsurance + annualMaintenance) / 12) * months +
    monthlyHOA * months;
  const basicNet = cashBack - downPayment - initialClosingCosts - interestPaid - otherCosts;
  const rentSaved = cumulativeRentSaved(months, monthlyRentSaved, annualRentGrowth);
  const oppCost = opportunityCost(downPayment + initialClosingCosts, opportunityCostRate, months);
  const taxBenefit = (annualTaxBenefit / 12) * months;
  const advancedNet = basicNet + rentSaved + taxBenefit - oppCost;

  return {
    year: months / 12,
    salePrice,
    loanBalance: remaining,
    sellingCosts,
    interestPaid,
    otherCosts,
    cashBack,
    rentSaved,
    oppCost,
    taxBenefit,
    basicNet,
    advancedNet,
    monthlyPayment: pmt(loanAmount, interestRate, loanTermYears),
  };
}

export function breakEvenMonth(inputs: BreakEvenInputs, useAdvanced: boolean): number | null {
  for (let m = 1; m <= 360; m++) {
    const row = computeBreakEvenRow(inputs, m);
    if ((useAdvanced ? row.advancedNet : row.basicNet) >= 0) return m;
  }
  return null;
}

export function buildBreakEvenTable(inputs: BreakEvenInputs): BreakEvenRow[] {
  const rows: BreakEvenRow[] = [];
  for (let y = 1; y <= inputs.maxYears; y++) {
    const r = computeBreakEvenRow(inputs, y * 12);
    rows.push(r);
  }
  return rows;
}

// ── Mortgage amortization ────────────────────────────────────────────────────

export function amortize(inputs: MortgageInputs): { rows: MortgageRow[]; totalMonths: number; totalInterest: number } {
  const { homePrice, downPayment, interestRate, loanTermYears, extraMonthlyPayment, displayYears } = inputs;
  const principal = Math.max(0, homePrice - downPayment);
  const r = interestRate / 100 / 12;
  const basePmt = pmt(principal, interestRate, loanTermYears);

  let balance = principal;
  const rows: MortgageRow[] = [];
  let cumInterest = 0;
  let totalMonths = 0;

  while (balance > 0.005 && rows.length < Math.max(displayYears, loanTermYears)) {
    let yPrinc = 0, yInt = 0, yPmt = 0;
    for (let m = 0; m < 12 && balance > 0.005; m++) {
      const intPmt = balance * r;
      let princPmt = basePmt - intPmt + extraMonthlyPayment;
      if (princPmt < 0) princPmt = 0;
      princPmt = Math.min(balance, princPmt);
      balance -= princPmt;
      yPrinc += princPmt;
      yInt += intPmt;
      yPmt += intPmt + princPmt;
      totalMonths++;
    }
    cumInterest += yInt;
    rows.push({
      year: rows.length + 1,
      annualPayment: yPmt,
      principalPaid: yPrinc,
      interestPaid: yInt,
      cumInterest,
      balance: Math.max(0, balance),
      equityPct: principal > 0 ? Math.min(100, ((principal - Math.max(0, balance)) / principal) * 100) : 100,
    });
    if (balance <= 0.005) break;
  }

  return { rows: rows.slice(0, displayYears), totalMonths, totalInterest: cumInterest };
}

// ── Affordability ─────────────────────────────────────────────────────────────

function maxLoanFromPI(maxPI: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (maxPI <= 0) return 0;
  if (r === 0) return maxPI * n;
  return (maxPI * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
}

export function calcAffordabilityScenario(
  inputs: AffordabilityInputs,
  frontDTI: number,
  backDTI: number,
  label: string
): AffordabilityScenario {
  const {
    annualIncome, monthlyDebts, downPayment,
    interestRate, loanTermYears, propertyTaxRate, annualInsurance, monthlyHOA,
  } = inputs;

  const monthlyIncome = annualIncome / 12;
  const maxPITI_front = monthlyIncome * frontDTI;
  const maxPITI_back = monthlyIncome * backDTI - monthlyDebts;
  const maxPITI = Math.max(0, Math.min(maxPITI_front, maxPITI_back));
  const monthlyIns = annualInsurance / 12;

  // Iterative solve: home price affects property tax, which feeds back into max PI
  let homePrice = 300000;
  for (let i = 0; i < 12; i++) {
    const monthlyTax = homePrice * (propertyTaxRate / 100) / 12;
    const maxPI = maxPITI - monthlyTax - monthlyIns - monthlyHOA;
    const loan = Math.max(0, maxLoanFromPI(maxPI, interestRate, loanTermYears));
    homePrice = loan + downPayment;
  }

  const loan = Math.max(0, homePrice - downPayment);
  const monthlyTax = homePrice * (propertyTaxRate / 100) / 12;
  const actualPI = pmt(loan, interestRate, loanTermYears);
  const actualPITI = actualPI + monthlyTax + monthlyIns + monthlyHOA;
  const dtiF = monthlyIncome > 0 ? actualPITI / monthlyIncome : 0;
  const dtiB = monthlyIncome > 0 ? (actualPITI + monthlyDebts) / monthlyIncome : 0;

  return {
    label,
    frontDTI,
    backDTI,
    maxPITI,
    maxPI: actualPI,
    maxLoan: loan,
    homePrice: Math.max(0, homePrice),
    monthlyTax,
    monthlyIns,
    monthlyHOA,
    dtiF,
    dtiB,
  };
}

export function calcAllAffordabilityScenarios(inputs: AffordabilityInputs): AffordabilityScenario[] {
  return [
    calcAffordabilityScenario(inputs, 0.28, 0.36, "Conservative"),
    calcAffordabilityScenario(inputs, 0.31, 0.43, "Moderate"),
    calcAffordabilityScenario(inputs, 0.36, 0.50, "Aggressive"),
  ];
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmt$(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmt$(Math.abs(n));
}

export function fmtBreakEven(months: number | null): string {
  if (months === null) return ">30 yrs";
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return `${y}y ${mo}m`;
}
