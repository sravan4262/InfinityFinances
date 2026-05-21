import type { AccountType, FireCurrency } from "./engine/types";

export const FIRE_CURRENCIES: Record<FireCurrency, {
  label: string;
  country: string;
  symbol: string;
  locale: string;
}> = {
  USD: { label: "USD", country: "United States", symbol: "$", locale: "en-US" },
  INR: { label: "INR", country: "India", symbol: "₹", locale: "en-IN" },
};

export const DEFAULT_FIRE_CURRENCY: FireCurrency = "USD";

export type AssetPreset = {
  label: string;
  annualReturn: number;
  accountType: AccountType;
  markets: Array<FireCurrency | "common">;
};

export const FIRE_ASSET_PRESETS: AssetPreset[] = [
  { label: "Stocks / Equity", annualReturn: 0.10, accountType: "taxable", markets: ["common"] },
  { label: "Bonds / Debt", annualReturn: 0.06, accountType: "taxable", markets: ["common"] },
  { label: "Real Estate", annualReturn: 0.08, accountType: "taxable", markets: ["common"] },
  { label: "Gold", annualReturn: 0.07, accountType: "taxable", markets: ["common"] },
  { label: "Cash / Savings", annualReturn: 0.04, accountType: "taxable", markets: ["common"] },
  { label: "Brokerage", annualReturn: 0.08, accountType: "taxable", markets: ["USD"] },
  { label: "Roth IRA", annualReturn: 0.10, accountType: "roth", markets: ["USD"] },
  { label: "Roth 401(k)", annualReturn: 0.09, accountType: "roth", markets: ["USD"] },
  { label: "Traditional 401(k)", annualReturn: 0.09, accountType: "traditional", markets: ["USD"] },
  { label: "Traditional IRA", annualReturn: 0.09, accountType: "traditional", markets: ["USD"] },
  { label: "HSA", annualReturn: 0.08, accountType: "traditional", markets: ["USD"] },
  { label: "SIP / Mutual Funds", annualReturn: 0.12, accountType: "taxable", markets: ["INR"] },
  { label: "EPF", annualReturn: 0.08, accountType: "traditional", markets: ["INR"] },
  { label: "PPF", annualReturn: 0.07, accountType: "traditional", markets: ["INR"] },
  { label: "NPS", annualReturn: 0.09, accountType: "traditional", markets: ["INR"] },
  { label: "Fixed Deposit", annualReturn: 0.06, accountType: "taxable", markets: ["INR"] },
  { label: "Other", annualReturn: 0.07, accountType: "taxable", markets: ["common"] },
];

export function getFireCurrency(currency: FireCurrency | undefined) {
  return FIRE_CURRENCIES[currency ?? DEFAULT_FIRE_CURRENCY];
}

export function getAssetPresets(currency: FireCurrency | undefined) {
  const selected = currency ?? DEFAULT_FIRE_CURRENCY;
  return FIRE_ASSET_PRESETS.filter((preset) =>
    preset.markets.includes("common") || preset.markets.includes(selected)
  );
}
