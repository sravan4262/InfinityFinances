import type { FireInputs, HistoricalScenario, HistoricalSequenceResult } from "./types";

// ── Historical annual real return sequences (approximated from public data) ────
// Each array represents annual real (inflation-adjusted) returns for a ~35-year window.
// Negative values = real losses. Used to stress-test the withdrawal phase.

export const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
  {
    label: "Great Depression (1929–1958)",
    shortLabel: "1929",
    description: "Catastrophic losses in first 3 years, followed by a grinding multi-decade recovery.",
    annualRealReturns: [
      -0.37, -0.28, -0.44,  0.54, -0.03,  0.45, -0.35,  0.29,  0.08, -0.13,
      -0.19,  0.46,  0.28, -0.07,  0.46,  0.22, -0.06,  0.05,  0.18,  0.12,
       0.18,  0.26, -0.02,  0.26, -0.09,  0.47, -0.01,  0.28,  0.16, -0.01,
    ],
  },
  {
    label: "Stagflation (1966–1995)",
    shortLabel: "1966",
    description: "16 years of near-zero or negative real returns before the 1982 bull market.",
    annualRealReturns: [
      -0.12,  0.19,  0.05, -0.17,  0.14, -0.26, -0.12,  0.01,  0.24,  0.14,
      -0.04,  0.21, -0.10,  0.17,  0.30, -0.03,  0.19,  0.31,  0.16,  0.28,
      -0.04,  0.05,  0.16,  0.02,  0.31,  0.38, -0.04,  0.20,  0.29, -0.12,
    ],
  },
  {
    label: "Dot-com Bust (2000–2029)",
    shortLabel: "2000",
    description: "Double-dip losses in first decade — dot-com crash then 2008 financial crisis.",
    annualRealReturns: [
      -0.10, -0.13, -0.23,  0.26,  0.09,  0.03,  0.13,  0.03, -0.38,  0.23,
       0.13,  0.00,  0.14,  0.30,  0.11, -0.01,  0.10,  0.19, -0.06,  0.28,
       0.26,  0.16, -0.20,  0.24,  0.09,  0.21,  0.15,  0.12,  0.08,  0.06,
    ],
  },
  {
    label: "Bull Market (1982–2011)",
    shortLabel: "1982",
    description: "Strong secular bull market — the most favorable retirement start in modern history.",
    annualRealReturns: [
       0.19,  0.22,  0.05,  0.26,  0.15,  0.02,  0.23,  0.12,  0.23,  0.30,
      -0.05,  0.07,  0.05, -0.07,  0.34,  0.21,  0.25,  0.31,  0.27,  0.20,
      -0.10, -0.13, -0.23,  0.26,  0.09,  0.03,  0.13,  0.03, -0.38,  0.23,
    ],
  },
  {
    label: "Post-COVID (2020–2049 est.)",
    shortLabel: "2020",
    description: "Sharp 2022 drawdown then partial recovery; future years use long-run average.",
    annualRealReturns: [
       0.16,  0.27, -0.19,  0.24,  0.23,  0.06,  0.07,  0.07,  0.07,  0.07,
       0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,
       0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,  0.07,
    ],
  },
];

// ── Deterministic sequence runner ─────────────────────────────────────────────

export function runHistoricalSequence(
  inputs: FireInputs,
  scenario: HistoricalScenario
): HistoricalSequenceResult {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    retirementSpending,
    assets,
    currentPortfolio,
    socialSecurityBenefit = 0,
    socialSecurityAge = 67,
    pensionBenefit = 0,
    pensionStartAge = 65,
  } = inputs;

  const initialNW =
    (assets ?? []).reduce((s, a) => s + a.value, 0) || currentPortfolio;

  // Project to retirement age using base expected return
  const realMean =
    (1 + inputs.expectedReturn) / (1 + inputs.inflationRate) - 1;
  const annualSavings = inputs.afterTaxIncome - inputs.currentSpending;
  let portfolioAtRetirement = initialNW;
  let savings = annualSavings;
  for (let age = currentAge + 1; age <= retirementAge; age++) {
    portfolioAtRetirement = portfolioAtRetirement * (1 + realMean) + savings;
    savings *= 1 + (inputs.savingsGrowthRate ?? 0);
  }

  // Withdrawal phase using historical returns
  let portfolio = portfolioAtRetirement;
  let depletionAge: number | null = null;
  const yearsInRetirement = lifeExpectancy - retirementAge;

  for (let y = 0; y < yearsInRetirement; y++) {
    const age = retirementAge + y;
    const ret = scenario.annualRealReturns[y] ?? realMean;
    const otherIncome =
      (age >= socialSecurityAge ? socialSecurityBenefit : 0) +
      (age >= pensionStartAge ? pensionBenefit : 0);
    const netWithdrawal = Math.max(0, retirementSpending - otherIncome);

    portfolio = portfolio * (1 + ret) - netWithdrawal;

    if (portfolio <= 0) {
      portfolio = 0;
      if (depletionAge === null) depletionAge = age;
    }
  }

  return {
    scenario,
    survived: portfolio > 0,
    portfolioAtEnd: Math.max(0, portfolio),
    depletionAge,
  };
}
