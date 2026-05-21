import type { FireInputs } from "./types";

export function mergeInputs(primary: FireInputs, spouse: FireInputs): FireInputs {
  const totalIncome = primary.afterTaxIncome + spouse.afterTaxIncome;
  const pw = totalIncome > 0 ? primary.afterTaxIncome / totalIncome : 0.5;
  const sw = 1 - pw;

  return {
    // Timeline: primary's reference ages, max life expectancy
    currentAge: primary.currentAge,
    retirementAge: primary.retirementAge,
    lifeExpectancy: Math.max(primary.lifeExpectancy, spouse.lifeExpectancy),

    // Income: sum both
    grossIncome: primary.grossIncome + spouse.grossIncome,
    afterTaxIncome: primary.afterTaxIncome + spouse.afterTaxIncome,

    // Spending: shared household — primary's (not doubled)
    currentSpending: primary.currentSpending,
    retirementSpending: primary.retirementSpending,
    monthlyRetirementSalary: primary.monthlyRetirementSalary,

    // Growth: income-weighted blend
    salaryGrowthRate: primary.salaryGrowthRate * pw + spouse.salaryGrowthRate * sw,
    savingsGrowthRate: primary.savingsGrowthRate,

    // Portfolio: combine all assets
    currentPortfolio: primary.currentPortfolio + spouse.currentPortfolio,
    expectedReturn: primary.expectedReturn,
    assets: [...primary.assets, ...spouse.assets],

    // Rates: primary's household decisions
    inflationRate: primary.inflationRate,
    withdrawalRate: primary.withdrawalRate,

    // All streams: concatenate both
    emis: [...(primary.emis ?? []), ...(spouse.emis ?? [])],
    savingsStreams: [...(primary.savingsStreams ?? []), ...(spouse.savingsStreams ?? [])],
    futureInvestments: [...(primary.futureInvestments ?? []), ...(spouse.futureInvestments ?? [])],
    futureExpenses: [...(primary.futureExpenses ?? []), ...(spouse.futureExpenses ?? [])],

    // Children: primary's only — shared, don't double-count
    children: primary.children,
    oneTimeEvents: [...(primary.oneTimeEvents ?? []), ...(spouse.oneTimeEvents ?? [])],

    // Benefits: sum both
    socialSecurityBenefit: (primary.socialSecurityBenefit ?? 0) + (spouse.socialSecurityBenefit ?? 0),
    socialSecurityAge: primary.socialSecurityAge,
    pensionBenefit: (primary.pensionBenefit ?? 0) + (spouse.pensionBenefit ?? 0),
    pensionStartAge: primary.pensionStartAge,

    // Tax: primary's household rates
    effectiveTaxRateAccumulation: primary.effectiveTaxRateAccumulation,
    effectiveTaxRateRetirement: primary.effectiveTaxRateRetirement,

    // Healthcare: sum premiums
    healthcarePremium: (primary.healthcarePremium ?? 0) + (spouse.healthcarePremium ?? 0),
    healthcareInflation: primary.healthcareInflation,
    medicareAge: primary.medicareAge,

    // Roth: sum conversions
    rothConversionAnnual: (primary.rothConversionAnnual ?? 0) + (spouse.rothConversionAnnual ?? 0),
  };
}
