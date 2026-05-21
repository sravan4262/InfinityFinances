import type { FireInputs, YearlyRow, FireResults } from "./types";

const LEAN_FIRE_MULTIPLIER = 0.7;
const FAT_FIRE_MULTIPLIER = 1.5;
const BARISTA_PART_TIME_INCOME = 0.4; // 40% of retirement spending covered by part-time work

export function calculateFire(inputs: FireInputs): FireResults {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    afterTaxIncome,
    currentSpending,
    currentPortfolio,
    expectedReturn,
    inflationRate,
    withdrawalRate,
    retirementSpending,
    socialSecurityBenefit = 0,
    socialSecurityAge = 67,
    pensionBenefit = 0,
    pensionStartAge = 65,
    effectiveTaxRateRetirement = 0,
    healthcarePremium = 0,
    healthcareInflation = 0.05,
    medicareAge = 65,
    children = [],
    oneTimeEvents = [],
    savingsGrowthRate = 0,
  } = inputs;

  const fireNumber = retirementSpending / withdrawalRate;
  const leanFireNumber = (retirementSpending * LEAN_FIRE_MULTIPLIER) / withdrawalRate;
  const fatFireNumber = (retirementSpending * FAT_FIRE_MULTIPLIER) / withdrawalRate;
  const baristaFireNumber =
    (retirementSpending * (1 - BARISTA_PART_TIME_INCOME)) / withdrawalRate;

  const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;

  let portfolio = currentPortfolio;
  let annualSavings = afterTaxIncome - currentSpending;
  let fireAge: number | null = null;
  let coastFireAchievedAge: number | null = null;
  const rows: YearlyRow[] = [];

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yearsFromNow = age - currentAge;
    const isRetired = age >= retirementAge;

    // Education expenses for this year
    let educationExpense = 0;
    for (const child of children) {
      const childAgeThisYear = child.currentAge + yearsFromNow;
      if (
        childAgeThisYear >= child.educationStartAge &&
        childAgeThisYear < child.educationEndAge
      ) {
        const inflatedCost =
          child.annualCostToday *
          Math.pow(1 + child.educationInflation, Math.max(0, childAgeThisYear - child.currentAge));
        educationExpense += inflatedCost;
      }
    }

    // One-time events
    let oneTimeNet = 0;
    for (const ev of oneTimeEvents) {
      if (ev.age === age) oneTimeNet += ev.amount;
    }

    // Other income in retirement
    let otherIncome = 0;
    if (isRetired) {
      if (age >= socialSecurityAge) otherIncome += socialSecurityBenefit;
      if (age >= pensionStartAge) otherIncome += pensionBenefit;
    }

    // Healthcare adjustment
    const healthcareThisYear =
      age < medicareAge
        ? healthcarePremium * Math.pow(1 + healthcareInflation, yearsFromNow)
        : 0;

    let netWithdrawal = 0;
    let spendingThisYear = 0;

    if (!isRetired) {
      // Accumulation: grow portfolio, add savings, subtract education and one-time expenses
      const effectiveSavings = annualSavings - educationExpense + oneTimeNet;
      portfolio = portfolio * (1 + realReturn) + effectiveSavings;
      spendingThisYear = currentSpending + educationExpense;
      annualSavings = annualSavings * (1 + savingsGrowthRate);
    } else {
      // Retirement: grow portfolio, subtract net withdrawals
      const grossSpend =
        retirementSpending + educationExpense + healthcareThisYear;
      const afterTaxNeeded = grossSpend / (1 - effectiveTaxRateRetirement);
      netWithdrawal = Math.max(0, afterTaxNeeded - otherIncome) + Math.abs(Math.min(0, oneTimeNet));
      const windfall = Math.max(0, oneTimeNet);
      portfolio = portfolio * (1 + realReturn) - netWithdrawal + windfall;
      spendingThisYear = grossSpend;
    }

    // Coast FIRE check (can stop contributing and still reach FIRE by retirementAge)
    if (!isRetired && coastFireAchievedAge === null) {
      const coastTarget =
        fireNumber /
        Math.pow(1 + realReturn, retirementAge - age);
      if (portfolio >= coastTarget) coastFireAchievedAge = age;
    }

    // FIRE achieved check
    if (fireAge === null && portfolio >= fireNumber) {
      fireAge = age;
    }

    rows.push({
      age,
      year: new Date().getFullYear() + yearsFromNow,
      portfolio: Math.max(0, portfolio),
      annualSavings: isRetired ? 0 : annualSavings,
      annualSpending: spendingThisYear,
      netWithdrawal,
      educationExpense,
      otherIncome,
      realReturn,
      isRetired,
      isFire: fireAge !== null && age >= fireAge,
      fireGap: portfolio - fireNumber,
    });
  }

  const targetRow = rows.find((r) => r.age === retirementAge);
  const projectedPortfolioAtTarget = targetRow?.portfolio ?? 0;

  // PV corpus (annual engine approximation)
  const retirementMonths = (lifeExpectancy - retirementAge) * 12;
  const realMonthlyReturn = Math.pow(1 + realReturn, 1 / 12) - 1;
  const monthlyRetirementSalary = inputs.retirementSpending / 12;
  const requiredCorpusPV =
    Math.abs(realMonthlyReturn) < 1e-10
      ? monthlyRetirementSalary * retirementMonths
      : monthlyRetirementSalary * (1 - Math.pow(1 + realMonthlyReturn, -retirementMonths)) / realMonthlyReturn;

  // Depletion age from yearly rows
  const depletionRow = rows.find((r) => r.isRetired && r.portfolio <= 0);
  const depletionAge = depletionRow?.age ?? null;

  // Phase 3 stubs
  const nominalRetirementSalary =
    monthlyRetirementSalary * Math.pow(1 + inflationRate, retirementAge - currentAge);

  return {
    fireNumber,
    fireAge,
    yearsToFire: fireAge !== null ? fireAge - currentAge : null,
    currentSavingsRate:
      afterTaxIncome > 0 ? (afterTaxIncome - currentSpending) / afterTaxIncome : 0,
    projectedPortfolioAtTarget,
    gapAtTargetAge: projectedPortfolioAtTarget - fireNumber,
    yearlyRows: rows,
    requiredCorpusPV,
    depletionAge,
    retirementSensitivity: [],
    nominalRetirementSalary,
    accountSequencing: {
      taxableAtRetirement: currentPortfolio,
      rothAtRetirement: 0,
      traditionalAtRetirement: 0,
      bridgeYears: Math.max(0, 59.5 - retirementAge),
      taxableDepletionAge: null,
      conversionLadderFirstAccessAge: null,
      earlyPenaltyTotal: 0,
      withdrawalRows: [],
    },
    leanFireNumber,
    fatFireNumber,
    coastFireNumber:
      fireNumber / Math.pow(1 + realReturn, retirementAge - currentAge),
    coastFireAchievedAge,
    baristaFireNumber,
  };
}
