import type { FireInputs, MonteCarloResults, MonteCarloPercentileRow } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sampleNormal(mean: number, sigma: number): number {
  // Box-Muller transform
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z;
}

function pct(sorted: number[], p: number): number {
  const idx = Math.min((p / 100) * (sorted.length - 1), sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Per-asset-label volatility estimates (annual std dev of real returns)
const LABEL_SIGMA: [RegExp, number][] = [
  [/stock|equity|sip|mutual/i, 0.18],
  [/bond|fd|debt|fixed/i,       0.07],
  [/real.?estate|property|reit/i,0.14],
  [/gold/i,                      0.16],
  [/cash|hysa|savings/i,         0.02],
  [/roth|ira|401|epf|ppf|hsa/i,  0.16],
];

export function inferVolatility(inputs: FireInputs): number {
  const assets = inputs.assets ?? [];
  const totalNW = assets.reduce((s, a) => s + a.value, 0);
  if (totalNW <= 0 || assets.length === 0) return 0.15;

  let weightedSigma = 0;
  for (const a of assets) {
    let sigma = 0.15; // default
    for (const [re, s] of LABEL_SIGMA) {
      if (re.test(a.label)) { sigma = s; break; }
    }
    weightedSigma += (a.value / totalNW) * sigma;
  }
  return weightedSigma;
}

// ── Main simulation ───────────────────────────────────────────────────────────

export function runMonteCarlo(
  inputs: FireInputs,
  numTrials = 1000,
  annualVolatilityOverride?: number
): MonteCarloResults {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    afterTaxIncome,
    currentSpending,
    retirementSpending,
    inflationRate,
    withdrawalRate,
    assets,
    expectedReturn,
    savingsGrowthRate = 0,
    socialSecurityBenefit = 0,
    socialSecurityAge = 67,
    pensionBenefit = 0,
    pensionStartAge = 65,
  } = inputs;

  const sigma = annualVolatilityOverride ?? inferVolatility(inputs);
  const realMean = (1 + expectedReturn) / (1 + inflationRate) - 1;
  const initialNW =
    (assets ?? []).reduce((s, a) => s + a.value, 0) || inputs.currentPortfolio;
  const fireNumber = retirementSpending / withdrawalRate;
  const years = lifeExpectancy - currentAge;

  // Buckets: portfoliosByAge[yearIndex] accumulates all trial values
  const byAge: number[][] = Array.from({ length: years + 1 }, () => []);
  let successCount = 0;

  for (let t = 0; t < numTrials; t++) {
    let portfolio = initialNW;
    let annualSavings = afterTaxIncome - currentSpending;
    byAge[0].push(portfolio);

    for (let y = 1; y <= years; y++) {
      const age = currentAge + y;
      const isRetired = age >= retirementAge;
      const rSample = sampleNormal(realMean, sigma);

      if (!isRetired) {
        portfolio = portfolio * (1 + rSample) + annualSavings;
        annualSavings *= 1 + savingsGrowthRate;
      } else {
        const otherIncome =
          (age >= socialSecurityAge ? socialSecurityBenefit : 0) +
          (age >= pensionStartAge ? pensionBenefit : 0);
        const netWithdrawal = Math.max(0, retirementSpending - otherIncome);
        portfolio = portfolio * (1 + rSample) - netWithdrawal;
      }

      portfolio = Math.max(0, portfolio);
      byAge[y].push(portfolio);
    }

    if (portfolio > 0) successCount++;
  }

  // Compute percentile rows
  const percentileRows: MonteCarloPercentileRow[] = byAge.map((vals, i) => {
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      age: currentAge + i,
      p10: Math.round(pct(sorted, 10)),
      p25: Math.round(pct(sorted, 25)),
      p50: Math.round(pct(sorted, 50)),
      p75: Math.round(pct(sorted, 75)),
      p90: Math.round(pct(sorted, 90)),
    };
  });

  // Median FIRE age (p50 crosses FIRE number before retirement)
  let medianFireAge: number | null = null;
  for (const row of percentileRows) {
    if (row.age > retirementAge) break;
    if (row.p50 >= fireNumber) { medianFireAge = row.age; break; }
  }

  // Worst-case (p10) depletion age
  let worstCaseDepletionAge: number | null = null;
  for (const row of percentileRows) {
    if (row.age >= retirementAge && row.p10 <= 0) {
      worstCaseDepletionAge = row.age;
      break;
    }
  }

  // Sequence risk score: p10 / p50 at retirement
  const retRow = percentileRows.find((r) => r.age >= retirementAge);
  const sequenceRiskScore =
    retRow && retRow.p50 > 0 ? retRow.p10 / retRow.p50 : 0;

  return {
    successRate: successCount / numTrials,
    percentileRows,
    medianFireAge,
    sequenceRiskScore,
    worstCaseDepletionAge,
    annualVolatility: sigma,
    numTrials,
  };
}
