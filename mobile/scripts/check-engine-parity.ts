import assert from "node:assert/strict";
import { calculateFireMonthly as calculateWeb } from "../../ui/lib/engine/monthly";
import { calculateFireMonthly as calculateMobile } from "../src/lib/engine/monthly";
import type { FireInputs } from "../src/lib/engine/types";

const base: FireInputs = {
  currentAge: 32, retirementAge: 50, lifeExpectancy: 90,
  grossIncome: 120000, afterTaxIncome: 90000, currentSpending: 54000,
  savingsGrowthRate: 0.02, salaryGrowthRate: 0.03, currentPortfolio: 80000,
  expectedReturn: 0.07, inflationRate: 0.03, withdrawalRate: 0.04,
  retirementSpending: 60000, monthlyRetirementSalary: 5000,
  assets: [{ label: "Stocks / Equity", value: 80000, annualReturn: 0.07, accountType: "taxable" }],
  emis: [], savingsStreams: [], futureInvestments: [], futureExpenses: []
};
const fixtures: Array<{ name: string; inputs: FireInputs }> = [
  { name: "simple-baseline", inputs: base },
  { name: "multi-asset", inputs: { ...base, currentPortfolio: 0, assets: [
    { label: "Stocks", value: 60000, annualReturn: 0.1, accountType: "taxable", monthlyContribution: 500 },
    { label: "Bonds", value: 20000, annualReturn: 0.05, accountType: "traditional", monthlyContribution: 250 }
  ] } },
  { name: "retirement-income", inputs: { ...base, socialSecurityBenefit: 18000, socialSecurityAge: 67, pensionBenefit: 12000, pensionStartAge: 65, healthcarePremium: 9000, effectiveTaxRateRetirement: 0.12 } }
];
const keys = ["fireNumber", "fireAge", "yearsToFire", "projectedPortfolioAtTarget", "gapAtTargetAge", "requiredCorpusPV", "depletionAge", "nominalRetirementSalary"] as const;
for (const fixture of fixtures) {
  const web = calculateWeb(fixture.inputs);
  const mobile = calculateMobile(fixture.inputs);
  for (const key of keys) assert.deepEqual(mobile[key], web[key], `${fixture.name}.${key}`);
  assert.deepEqual(mobile.yearlyRows, web.yearlyRows, `${fixture.name}.yearlyRows`);
}
console.log(`✓ ${fixtures.length} mobile FIRE fixtures match the web engine`);
