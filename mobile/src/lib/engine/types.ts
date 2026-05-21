export type AccountType = "taxable" | "roth" | "traditional";
export type FireCurrency = "USD" | "INR";

export interface AssetClass {
  label: string;
  value: number;           // current balance in dollars
  annualReturn: number;    // nominal annual return, e.g. 0.10
  accountType?: AccountType; // default: "taxable"
  monthlyContribution?: number; // ongoing monthly investment into this asset
}

// Per-year breakdown of which buckets funded retirement spending
export interface WithdrawalSequenceRow {
  age: number;
  taxable: number;
  rothBasis: number;
  traditional: number;
  earlyPenalty: number; // 10% penalty paid on traditional accessed before 59.5
}

export interface AccountSequencingResult {
  taxableAtRetirement: number;
  rothAtRetirement: number;
  traditionalAtRetirement: number;
  bridgeYears: number;                    // years of taxable runway before age 59.5
  taxableDepletionAge: number | null;     // when taxable bucket runs dry
  conversionLadderFirstAccessAge: number | null; // age when first Roth conversion tranche unlocks
  earlyPenaltyTotal: number;             // cumulative 10% penalties paid across simulation
  withdrawalRows: WithdrawalSequenceRow[];
}

export interface EmiStream {
  label: string;
  monthlyAmount: number;
  endDate: string;           // "YYYY-MM" format
  redirectToSavings: boolean; // freed EMI cash goes back to monthly savings after payoff
}

// Phase 3 types ───────────────────────────────────────────────────────────────

export interface SavingsStream {
  label: string;
  monthlyAmount: number;
  annualIncreaseRate: number; // how much this stream grows each year (e.g. salary growth)
  startDate: string;          // "YYYY-MM" — empty = starts immediately
  endDate: string;            // "YYYY-MM" — empty = no end date
}

export interface FutureInvestment {
  label: string;
  purchaseDate: string;        // "YYYY-MM"
  investmentValue: number;     // value of the asset at purchase
  annualReturn: number;        // appreciation rate after purchase
  downPayment: number;         // upfront cash required
  deductDownPayment: boolean;  // deduct down payment from net worth at purchase
  emiAmount: number;           // monthly EMI for this purchase
  emiStartDate: string;        // "YYYY-MM"
  emiEndDate: string;          // "YYYY-MM"
  deductEmiFromSavings: boolean; // subtract EMI from monthly savings while active
}

export interface FutureExpense {
  label: string;
  monthlyAmount: number;
  startDate: string;  // "YYYY-MM"
  endDate: string;    // "YYYY-MM"
}

export interface ChildOneTimeExpense {
  label: string;
  date: string;   // "YYYY-MM"
  amount: number;
}

export interface RetirementSensitivityRow {
  retirementAge: number;
  requiredCorpus: number;       // PV corpus at that retirement age
  projectedPortfolio: number;   // what the sim projects at that age
  shortfall: number;            // requiredCorpus - projectedPortfolio (negative = surplus)
  monthlySavingsNeeded: number; // additional monthly savings needed to close gap from today
}

// ─────────────────────────────────────────────────────────────────────────────

export interface FireInputs {
  currency?: FireCurrency;

  // Identity
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;

  // Income & savings
  grossIncome: number;
  afterTaxIncome: number;
  currentSpending: number;
  savingsGrowthRate: number; // annual % increase on the base (income-spending) savings
  salaryGrowthRate: number;

  // Portfolio — simple single-balance (fallback when assets is empty)
  currentPortfolio: number;
  expectedReturn: number;   // nominal annual %
  inflationRate: number;    // annual %
  withdrawalRate: number;   // e.g. 0.04

  // Phase 2
  assets: AssetClass[];
  emis: EmiStream[];
  monthlyRetirementSalary?: number;

  // Retirement spending (annual)
  retirementSpending: number;

  // Phase 3
  savingsStreams: SavingsStream[];
  futureInvestments: FutureInvestment[];
  futureExpenses: FutureExpense[];

  // Phase 6
  rothConversionAnnual?: number; // annual $ to convert traditional → Roth during accumulation

  // Advanced — optional
  socialSecurityBenefit?: number;
  socialSecurityAge?: number;
  pensionBenefit?: number;
  pensionStartAge?: number;
  effectiveTaxRateAccumulation?: number;
  effectiveTaxRateRetirement?: number;
  healthcarePremium?: number;
  healthcareInflation?: number;
  medicareAge?: number;
  children?: ChildEducation[];
  oneTimeEvents?: OneTimeEvent[];
}

export interface ChildEducation {
  label: string;
  currentAge: number;
  educationStartAge: number;
  educationEndAge: number;
  annualCostToday: number;
  educationInflation: number;
  // Phase 3 additions (optional for backward compat)
  monthlyLivingExpenses?: number;         // e.g. groceries, clothing, activities
  livingEndAge?: number;                  // age when living expenses stop (default = educationEndAge)
  oneTimeExpenses?: ChildOneTimeExpense[];
}

export interface OneTimeEvent {
  age: number;
  amount: number; // positive = income/windfall, negative = expense
  label: string;
}

export interface YearlyRow {
  age: number;
  year: number;
  portfolio: number;
  annualSavings: number;
  annualSpending: number;
  netWithdrawal: number;
  educationExpense: number;
  otherIncome: number;
  realReturn: number;
  isRetired: boolean;
  isFire: boolean;
  fireGap: number;
}

// ── Phase 7: Monte Carlo ──────────────────────────────────────────────────────

export interface MonteCarloPercentileRow {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloResults {
  successRate: number;                    // fraction of 1000 trials that didn't deplete
  percentileRows: MonteCarloPercentileRow[];
  medianFireAge: number | null;           // age when p50 crosses FIRE number
  sequenceRiskScore: number;              // p10/p50 at retirement age (lower = more exposed)
  worstCaseDepletionAge: number | null;   // age when p10 hits zero
  annualVolatility: number;               // sigma used in simulation
  numTrials: number;
}

export interface HistoricalScenario {
  label: string;
  shortLabel: string;
  description: string;
  annualRealReturns: number[];            // year-by-year real returns for the withdrawal phase
}

export interface HistoricalSequenceResult {
  scenario: HistoricalScenario;
  survived: boolean;
  portfolioAtEnd: number;
  depletionAge: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface FireResults {
  fireNumber: number;
  fireAge: number | null;
  yearsToFire: number | null;
  currentSavingsRate: number;
  projectedPortfolioAtTarget: number;
  gapAtTargetAge: number;
  yearlyRows: YearlyRow[];

  // Phase 2
  requiredCorpusPV: number;
  depletionAge: number | null;

  // Phase 3
  retirementSensitivity: RetirementSensitivityRow[];
  nominalRetirementSalary: number; // today's monthly target inflated to retirement date

  // Phase 6
  accountSequencing: AccountSequencingResult;

  // Variants
  leanFireNumber: number;
  fatFireNumber: number;
  coastFireNumber: number;
  coastFireAchievedAge: number | null;
  baristaFireNumber: number;
}
