import type {
  FireInputs,
  FireResults,
  YearlyRow,
  RetirementSensitivityRow,
  AccountSequencingResult,
  WithdrawalSequenceRow,
} from "./types";

const LEAN_FIRE_MULTIPLIER = 0.7;
const FAT_FIRE_MULTIPLIER = 1.5;
const BARISTA_PART_TIME_INCOME = 0.4;

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { year: parts[0], month: parts[1] - 1 }; // month 0-indexed
}

/** True if sim date (year/month 0-indexed) is on or before the given "YYYY-MM" string */
function onOrBefore(simYear: number, simMonth: number, dateStr: string): boolean {
  const d = parseYearMonth(dateStr);
  if (!d) return false;
  if (simYear < d.year) return true;
  if (simYear === d.year && simMonth <= d.month) return true;
  return false;
}

/** True if sim date is on or after the given "YYYY-MM" string */
function onOrAfter(simYear: number, simMonth: number, dateStr: string): boolean {
  const d = parseYearMonth(dateStr);
  if (!d) return true; // no start = always active
  if (simYear > d.year) return true;
  if (simYear === d.year && simMonth >= d.month) return true;
  return false;
}

/** True if sim date is within [startStr, endStr], with empty string meaning open-ended */
function dateInWindow(
  simYear: number,
  simMonth: number,
  startStr: string,
  endStr: string
): boolean {
  if (startStr && !onOrAfter(simYear, simMonth, startStr)) return false;
  if (endStr && !onOrBefore(simYear, simMonth, endStr)) return false;
  return true;
}

/** True if sim date is exactly at "YYYY-MM" */
function isExactMonth(simYear: number, simMonth: number, dateStr: string): boolean {
  const d = parseYearMonth(dateStr);
  if (!d) return false;
  return simYear === d.year && simMonth === d.month;
}

// ── Finance helpers ───────────────────────────────────────────────────────────

function pvAnnuity(monthlyPayment: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-10) return monthlyPayment * n;
  return (monthlyPayment * (1 - Math.pow(1 + r, -n))) / r;
}

/** Monthly PMT needed to reach FV, given starting PV and real monthly return r over n months */
function pmtToReachFV(fv: number, pv: number, r: number, n: number): number {
  if (n <= 0) return fv > pv ? Infinity : 0;
  if (Math.abs(r) < 1e-10) return Math.max(0, (fv - pv) / n);
  const fvFactor = Math.pow(1 + r, n);
  return Math.max(0, ((fv - pv * fvFactor) * r) / (fvFactor - 1));
}

// ─────────────────────────────────────────────────────────────────────────────

export function calculateFireMonthly(inputs: FireInputs): FireResults {
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
    savingsGrowthRate = 0,
    socialSecurityBenefit = 0,
    socialSecurityAge = 67,
    pensionBenefit = 0,
    pensionStartAge = 65,
    effectiveTaxRateRetirement = 0,
    healthcarePremium = 0,
    healthcareInflation = 0.05,
    medicareAge = 65,
    children = [],
    assets = [],
    emis = [],
    savingsStreams = [],
    futureInvestments = [],
    futureExpenses = [],
    rothConversionAnnual = 0,
  } = inputs;

  const monthlyRetirementSalary =
    inputs.monthlyRetirementSalary ?? retirementSpending / 12;

  // ── Sensible fallbacks for unset fields ───────────────────────────────────
  const effectiveWithdrawalRate = withdrawalRate > 0 ? withdrawalRate : 0.04;
  const effectiveExpectedReturn = expectedReturn > 0 ? expectedReturn : 0.07;
  const effectiveInflationRate  = inflationRate  > 0 ? inflationRate  : 0.03;

  // ── Rate conversions ───────────────────────────────────────────────────────
  const monthlyInflation = Math.pow(1 + effectiveInflationRate, 1 / 12) - 1;
  const realAnnualReturn = (1 + effectiveExpectedReturn) / (1 + effectiveInflationRate) - 1;
  const realMonthlyReturn = Math.pow(1 + realAnnualReturn, 1 / 12) - 1;

  // ── Per-asset real monthly returns ────────────────────────────────────────
  const effectiveAssets =
    assets.length > 0
      ? assets.map((a) => ({ ...a }))
      : [{ label: "Portfolio", value: currentPortfolio, annualReturn: effectiveExpectedReturn }];

  const assetNetMonthlyReturns = effectiveAssets.map((a) => {
    const mr = Math.pow(1 + (a.annualReturn > 0 ? a.annualReturn : effectiveExpectedReturn), 1 / 12) - 1;
    return (1 + mr) / (1 + monthlyInflation) - 1;
  });

  // ── FIRE / variant numbers ────────────────────────────────────────────────
  const fireNumber = retirementSpending / effectiveWithdrawalRate;
  const leanFireNumber = (retirementSpending * LEAN_FIRE_MULTIPLIER) / effectiveWithdrawalRate;
  const fatFireNumber = (retirementSpending * FAT_FIRE_MULTIPLIER) / effectiveWithdrawalRate;
  const baristaFireNumber =
    (retirementSpending * (1 - BARISTA_PART_TIME_INCOME)) / effectiveWithdrawalRate;

  // ── PV corpus formula ─────────────────────────────────────────────────────
  const retirementMonths = (lifeExpectancy - retirementAge) * 12;
  const requiredCorpusPV = pvAnnuity(
    monthlyRetirementSalary,
    realMonthlyReturn,
    retirementMonths
  );

  // ── Nominal retirement salary (today's target × inflation to retirement) ──
  const yearsToRetirement = retirementAge - currentAge;
  const nominalRetirementSalary =
    monthlyRetirementSalary * Math.pow(1 + inflationRate, yearsToRetirement);

  const coastFireNumber =
    fireNumber / Math.pow(1 + realAnnualReturn, retirementAge - currentAge);

  // ── Initial base monthly savings ──────────────────────────────────────────
  let baseMonthlySavings = (afterTaxIncome - currentSpending) / 12;

  // ── Sim state ─────────────────────────────────────────────────────────────
  let fireAge: number | null = null;
  let depletionAge: number | null = null;
  let coastFireAchievedAge: number | null = null;
  const purchasedInvestments = new Set<number>();

  const totalMonths = (lifeExpectancy - currentAge) * 12;
  const yearlyRows: YearlyRow[] = [];

  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth(); // 0-indexed

  // Snapshot initial net worth for sensitivity table PMT calc
  const initialNetWorth = effectiveAssets.reduce((s, a) => s + a.value, 0);

  // ── Account-sequencing state (Phase 6) ────────────────────────────────────
  // Roth conversion queue: each entry is a tranche that unlocks 5 years after conversion
  interface ConversionTranche { amount: number; unlockAge: number; }
  const conversionQueue: ConversionTranche[] = [];
  let earlyPenaltyTotal = 0;
  let taxableDepletionAge: number | null = null;
  let conversionLadderFirstAccessAge: number | null = null;
  // per-year accumulator for withdrawal breakdown (indexed by age integer)
  const withdrawalRowMap = new Map<number, WithdrawalSequenceRow>();

  // Derive which asset indices belong to each account type
  // (checked dynamically each month so future investments get the right type)
  const getAccountType = (idx: number) =>
    effectiveAssets[idx]?.accountType ?? "taxable";

  for (let m = 0; m <= totalMonths; m++) {
    const ageExact = currentAge + m / 12;
    const simYear = todayYear + Math.floor((todayMonth + m) / 12);
    const simMonth = (todayMonth + m) % 12;
    const isRetired = ageExact >= retirementAge;

    // ── Activate future investments at purchase month ──────────────────────
    for (let fi = 0; fi < futureInvestments.length; fi++) {
      const inv = futureInvestments[fi];
      if (!purchasedInvestments.has(fi) && isExactMonth(simYear, simMonth, inv.purchaseDate)) {
        const mr = Math.pow(1 + inv.annualReturn, 1 / 12) - 1;
        const netMr = (1 + mr) / (1 + monthlyInflation) - 1;
        effectiveAssets.push({ label: inv.label, value: inv.investmentValue, annualReturn: inv.annualReturn });
        assetNetMonthlyReturns.push(netMr);
        purchasedInvestments.add(fi);

        // Deduct down payment from existing assets proportionally
        if (inv.deductDownPayment && inv.downPayment > 0) {
          const existingNW = effectiveAssets
            .slice(0, -1)
            .reduce((s, a) => s + a.value, 0);
          if (existingNW > 0) {
            for (let ai = 0; ai < effectiveAssets.length - 1; ai++) {
              effectiveAssets[ai].value = Math.max(
                0,
                effectiveAssets[ai].value - inv.downPayment * (effectiveAssets[ai].value / existingNW)
              );
            }
          }
        }
      }
    }

    // ── Compute total net worth ────────────────────────────────────────────
    const totalNetWorth = effectiveAssets.reduce((s, a) => s + a.value, 0);

    // ── FIRE / depletion checks ───────────────────────────────────────────
    if (!isRetired && fireAge === null && totalNetWorth >= fireNumber) {
      fireAge = currentAge + m / 12;
    }
    if (isRetired && depletionAge === null && totalNetWorth <= 0) {
      depletionAge = currentAge + m / 12;
    }

    // ── Yearly snapshot ───────────────────────────────────────────────────
    if (m % 12 === 0) {
      const ageInt = currentAge + m / 12;
      const yearIdx = m / 12;

      let educationExpense = 0;
      for (const child of children) {
        const childAge = child.currentAge + yearIdx;
        if (childAge >= child.educationStartAge && childAge < child.educationEndAge) {
          educationExpense +=
            child.annualCostToday * Math.pow(1 + child.educationInflation, yearIdx);
        }
      }

      let otherIncome = 0;
      if (isRetired) {
        if (ageInt >= socialSecurityAge) otherIncome += socialSecurityBenefit;
        if (ageInt >= pensionStartAge) otherIncome += pensionBenefit;
      }

      const healthcareThisYear =
        ageInt < medicareAge
          ? healthcarePremium * Math.pow(1 + healthcareInflation, yearIdx)
          : 0;

      const grossSpend = isRetired
        ? retirementSpending + educationExpense + healthcareThisYear
        : currentSpending + educationExpense;
      const afterTaxNeeded = isRetired
        ? grossSpend / (1 - Math.max(0, Math.min(0.99, effectiveTaxRateRetirement)))
        : 0;
      const netWithdrawal = isRetired
        ? Math.max(0, afterTaxNeeded - otherIncome)
        : 0;

      yearlyRows.push({
        age: ageInt,
        year: todayYear + yearIdx,
        portfolio: Math.max(0, totalNetWorth),
        annualSavings: isRetired ? 0 : baseMonthlySavings * 12,
        annualSpending: grossSpend,
        netWithdrawal,
        educationExpense,
        otherIncome,
        realReturn: realAnnualReturn,
        isRetired,
        isFire: fireAge !== null && ageExact >= fireAge,
        fireGap: totalNetWorth - fireNumber,
      });
    }

    // ── Apply per-asset growth ────────────────────────────────────────────
    for (let i = 0; i < effectiveAssets.length; i++) {
      effectiveAssets[i].value *= 1 + assetNetMonthlyReturns[i];
    }

    const postGrowthNW = effectiveAssets.reduce((s, a) => s + a.value, 0);

    // ── Cash-flow adjustments ─────────────────────────────────────────────
    if (!isRetired) {
      // Base EMI deductions / redirects
      let activeEMITotal = 0;
      let redirectedEMITotal = 0;
      for (const emi of emis) {
        if (onOrBefore(simYear, simMonth, emi.endDate)) {
          activeEMITotal += emi.monthlyAmount;
        } else if (emi.redirectToSavings) {
          redirectedEMITotal += emi.monthlyAmount;
        }
      }

      // Savings streams (additive)
      let streamsTotal = 0;
      for (const stream of savingsStreams) {
        if (dateInWindow(simYear, simMonth, stream.startDate, stream.endDate)) {
          const start = parseYearMonth(stream.startDate);
          const yearsFromStreamStart = start
            ? (simYear - start.year + (simMonth - start.month) / 12) / 1
            : m / 12;
          const amount =
            stream.monthlyAmount *
            Math.pow(1 + stream.annualIncreaseRate, Math.max(0, yearsFromStreamStart));
          streamsTotal += amount;
        }
      }

      // Future investment EMIs
      let futureEMITotal = 0;
      for (const inv of futureInvestments) {
        if (
          inv.deductEmiFromSavings &&
          inv.emiAmount > 0 &&
          dateInWindow(simYear, simMonth, inv.emiStartDate, inv.emiEndDate)
        ) {
          futureEMITotal += inv.emiAmount;
        }
      }

      // Future expenses
      let futureExpenseTotal = 0;
      for (const exp of futureExpenses) {
        if (dateInWindow(simYear, simMonth, exp.startDate, exp.endDate)) {
          futureExpenseTotal += exp.monthlyAmount;
        }
      }

      // Education deduction (monthly share)
      let monthlyEdDeduction = 0;
      for (const child of children) {
        const childAge = child.currentAge + m / 12;
        if (childAge >= child.educationStartAge && childAge < child.educationEndAge) {
          monthlyEdDeduction +=
            (child.annualCostToday * Math.pow(1 + child.educationInflation, m / 12)) / 12;
        }
        // Monthly living expenses
        const livingEnd = child.livingEndAge ?? child.educationEndAge;
        if (
          child.monthlyLivingExpenses &&
          child.monthlyLivingExpenses > 0 &&
          childAge >= 0 &&
          childAge < livingEnd
        ) {
          monthlyEdDeduction += child.monthlyLivingExpenses;
        }
        // One-time child expenses
        if (child.oneTimeExpenses) {
          for (const ote of child.oneTimeExpenses) {
            if (isExactMonth(simYear, simMonth, ote.date)) {
              monthlyEdDeduction += ote.amount;
            }
          }
        }
      }

      // Net monthly inflow (base savings, no per-asset contributions yet)
      const netMonthlyIn =
        baseMonthlySavings +
        redirectedEMITotal +
        streamsTotal -
        activeEMITotal -
        futureEMITotal -
        futureExpenseTotal -
        monthlyEdDeduction;

      // Allocate proportionally to asset weights
      if (postGrowthNW > 0) {
        for (let i = 0; i < effectiveAssets.length; i++) {
          effectiveAssets[i].value +=
            netMonthlyIn * (effectiveAssets[i].value / postGrowthNW);
        }
      } else if (effectiveAssets.length > 0) {
        effectiveAssets[0].value += netMonthlyIn;
      }

      // Per-asset monthly contributions go directly into each asset
      for (let i = 0; i < effectiveAssets.length; i++) {
        const contrib = effectiveAssets[i].monthlyContribution ?? 0;
        if (contrib > 0) effectiveAssets[i].value += contrib;
      }

      // Annual base savings growth
      if (m > 0 && m % 12 === 0) {
        baseMonthlySavings *= 1 + savingsGrowthRate;
      }
    } else {
      // ── Retirement drawdown ──────────────────────────────────────────────
      const otherMonthlyIncome =
        (ageExact >= socialSecurityAge ? socialSecurityBenefit : 0) / 12 +
        (ageExact >= pensionStartAge ? pensionBenefit : 0) / 12;

      const taxRate = Math.max(0, Math.min(0.99, effectiveTaxRateRetirement));
      const grossMonthlyNeed = monthlyRetirementSalary / (1 - taxRate);
      let remaining = Math.max(0, grossMonthlyNeed - otherMonthlyIncome);

      const ageInt = Math.floor(ageExact);
      if (!withdrawalRowMap.has(ageInt)) {
        withdrawalRowMap.set(ageInt, { age: ageInt, taxable: 0, rothBasis: 0, traditional: 0, earlyPenalty: 0 });
      }
      const wRow = withdrawalRowMap.get(ageInt)!;

      const isEarly = ageExact < 59.5;

      // Accessible Roth basis = sum of Roth assets (contributions) + unlocked conversions
      const unlockedConversions = conversionQueue
        .filter((t) => ageExact >= t.unlockAge)
        .reduce((s, t) => s + t.amount, 0);

      // Track first conversion ladder access
      if (conversionLadderFirstAccessAge === null && unlockedConversions > 0) {
        conversionLadderFirstAccessAge = ageExact;
      }

      // --- Step 1: draw from taxable assets ---
      const taxableIndices = effectiveAssets.map((_, i) => i).filter((i) => getAccountType(i) === "taxable");
      const totalTaxable = taxableIndices.reduce((s, i) => s + effectiveAssets[i].value, 0);

      if (totalTaxable > 0 && remaining > 0) {
        const draw = Math.min(remaining, totalTaxable);
        for (const i of taxableIndices) {
          const share = effectiveAssets[i].value / totalTaxable;
          effectiveAssets[i].value = Math.max(0, effectiveAssets[i].value - draw * share);
        }
        wRow.taxable += draw;
        remaining -= draw;

        // Track when taxable depletes
        const newTaxable = taxableIndices.reduce((s, i) => s + effectiveAssets[i].value, 0);
        if (taxableDepletionAge === null && newTaxable <= 0) {
          taxableDepletionAge = ageExact;
        }
      }

      // --- Step 2: draw from Roth assets (accessible basis first) ---
      const rothIndices = effectiveAssets.map((_, i) => i).filter((i) => getAccountType(i) === "roth");
      const totalRoth = rothIndices.reduce((s, i) => s + effectiveAssets[i].value, 0);
      // Before 59.5: only basis (contributions + unlocked conversions) is accessible
      const accessibleRoth = isEarly
        ? Math.min(totalRoth, unlockedConversions + rothIndices.reduce((s, i) => {
            // approximate: treat each Roth asset's initial allocation as basis
            return s + Math.min(effectiveAssets[i].value, effectiveAssets[i].value);
          }, 0))
        : totalRoth;

      if (accessibleRoth > 0 && remaining > 0) {
        const draw = Math.min(remaining, accessibleRoth);
        if (totalRoth > 0) {
          for (const i of rothIndices) {
            const share = effectiveAssets[i].value / totalRoth;
            effectiveAssets[i].value = Math.max(0, effectiveAssets[i].value - draw * share);
          }
        }
        wRow.rothBasis += draw;
        remaining -= draw;
      }

      // --- Step 3: draw from traditional ---
      const tradIndices = effectiveAssets.map((_, i) => i).filter((i) => getAccountType(i) === "traditional");
      const totalTrad = tradIndices.reduce((s, i) => s + effectiveAssets[i].value, 0);

      if (totalTrad > 0 && remaining > 0) {
        // If early, 10% penalty means we must gross up: to get $X after-penalty, withdraw $X / 0.9
        const grossUpFactor = isEarly ? 1 / 0.9 : 1;
        const grossDraw = Math.min(remaining * grossUpFactor, totalTrad);
        const penalty = isEarly ? grossDraw - grossDraw / grossUpFactor : 0;
        for (const i of tradIndices) {
          const share = effectiveAssets[i].value / totalTrad;
          effectiveAssets[i].value = Math.max(0, effectiveAssets[i].value - grossDraw * share);
        }
        wRow.traditional += grossDraw - penalty;
        wRow.earlyPenalty += penalty;
        earlyPenaltyTotal += penalty;
        remaining -= (grossDraw - penalty);
      }

      // --- Step 4: any remaining drawn proportionally from all (fallback) ---
      if (remaining > 0 && postGrowthNW > 0) {
        for (let i = 0; i < effectiveAssets.length; i++) {
          const share = effectiveAssets[i].value / postGrowthNW;
          effectiveAssets[i].value = Math.max(0, effectiveAssets[i].value - remaining * share);
        }
      }
    }

    // ── Roth conversion ladder (accumulation only) ─────────────────────────
    if (!isRetired && rothConversionAnnual > 0 && m > 0) {
      const monthlyConversion = rothConversionAnnual / 12;
      const tradIndices = effectiveAssets.map((_, i) => i).filter((i) => getAccountType(i) === "traditional");
      const tradTotal = tradIndices.reduce((s, i) => s + effectiveAssets[i].value, 0);
      if (tradTotal > 0) {
        const actualConv = Math.min(monthlyConversion, tradTotal);
        // Reduce traditional
        for (const i of tradIndices) {
          effectiveAssets[i].value -= actualConv * (effectiveAssets[i].value / tradTotal);
        }
        // Add to Roth (proportionally to roth assets, or first roth asset)
        const rothIndices = effectiveAssets.map((_, i) => i).filter((i) => getAccountType(i) === "roth");
        if (rothIndices.length > 0) {
          effectiveAssets[rothIndices[0]].value += actualConv;
        }
        // Queue with 5-year unlock
        conversionQueue.push({ amount: actualConv, unlockAge: ageExact + 5 });
      }
    }

    // ── Coast FIRE check ─────────────────────────────────────────────────
    if (!isRetired && coastFireAchievedAge === null) {
      const coastTarget =
        fireNumber / Math.pow(1 + realAnnualReturn, retirementAge - ageExact);
      if (totalNetWorth >= coastTarget) coastFireAchievedAge = ageExact;
    }
  }

  // ── Account sequencing final aggregation ─────────────────────────────────
  // Snapshot balances at retirement age from yearlyRows
  // (effectiveAssets at this point is at lifeExpectancy — use retirement row to estimate ratio)
  const retirementYearRow = yearlyRows.find((r) => r.age >= retirementAge);
  const finalNW = effectiveAssets.reduce((s, a) => s + a.value, 0);

  // Get current (post-sim) asset values at retirement proportions from the sim
  // For display, compute balances at retirement by scaling final values
  const retirementScale =
    retirementYearRow && finalNW > 0
      ? retirementYearRow.portfolio / finalNW
      : 1;

  const taxableAtRetirement = effectiveAssets
    .filter((a) => (a.accountType ?? "taxable") === "taxable")
    .reduce((s, a) => s + a.value * retirementScale, 0);
  const rothAtRetirement = effectiveAssets
    .filter((a) => a.accountType === "roth")
    .reduce((s, a) => s + a.value * retirementScale, 0);
  const traditionalAtRetirement = effectiveAssets
    .filter((a) => a.accountType === "traditional")
    .reduce((s, a) => s + a.value * retirementScale, 0);

  const bridgeYears = Math.max(0, 59.5 - retirementAge);

  const accountSequencing: AccountSequencingResult = {
    taxableAtRetirement,
    rothAtRetirement,
    traditionalAtRetirement,
    bridgeYears,
    taxableDepletionAge: taxableDepletionAge !== null ? Math.round(taxableDepletionAge * 10) / 10 : null,
    conversionLadderFirstAccessAge:
      conversionLadderFirstAccessAge !== null
        ? Math.round(conversionLadderFirstAccessAge * 10) / 10
        : null,
    earlyPenaltyTotal: Math.round(earlyPenaltyTotal),
    withdrawalRows: Array.from(withdrawalRowMap.values()),
  };

  // ── Final aggregation ─────────────────────────────────────────────────────
  const targetRow = yearlyRows.find((r) => r.age >= retirementAge);
  const projectedPortfolioAtTarget = targetRow?.portfolio ?? 0;
  const currentSavingsRate =
    afterTaxIncome > 0 ? (afterTaxIncome - currentSpending) / afterTaxIncome : 0;

  // ── Retirement age sensitivity table ─────────────────────────────────────
  const SENSITIVITY_AGES = [40, 45, 50, 55, 60, 65];
  const retirementSensitivity: RetirementSensitivityRow[] = SENSITIVITY_AGES
    .filter((age) => age > currentAge)
    .map((targetAge) => {
      const n = (lifeExpectancy - targetAge) * 12;
      const required = pvAnnuity(monthlyRetirementSalary, realMonthlyReturn, n);
      const simRow = yearlyRows.find((r) => r.age >= targetAge);
      const projected = simRow?.portfolio ?? 0;
      const monthsToTarget = (targetAge - currentAge) * 12;
      const monthly = pmtToReachFV(required, initialNetWorth, realMonthlyReturn, monthsToTarget);
      return {
        retirementAge: targetAge,
        requiredCorpus: required,
        projectedPortfolio: projected,
        shortfall: required - projected,
        monthlySavingsNeeded: monthly,
      };
    });

  return {
    fireNumber,
    fireAge: fireAge !== null ? Math.round(fireAge * 10) / 10 : null,
    yearsToFire:
      fireAge !== null ? Math.round((fireAge - currentAge) * 10) / 10 : null,
    currentSavingsRate,
    projectedPortfolioAtTarget,
    gapAtTargetAge: projectedPortfolioAtTarget - fireNumber,
    yearlyRows,
    requiredCorpusPV,
    depletionAge: depletionAge !== null ? Math.round(depletionAge * 10) / 10 : null,
    retirementSensitivity,
    nominalRetirementSalary,
    accountSequencing,
    leanFireNumber,
    fatFireNumber,
    coastFireNumber,
    coastFireAchievedAge:
      coastFireAchievedAge !== null ? Math.round(coastFireAchievedAge * 10) / 10 : null,
    baristaFireNumber,
  };
}
