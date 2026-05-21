import { calculateFire } from "./mvp";
import type { FireInputs } from "./types";

type SensitivityKey =
  | "expectedReturn"
  | "retirementSpending"
  | "withdrawalRate"
  | "currentSpending"
  | "afterTaxIncome";

export interface SensitivityPoint {
  value: number;
  fireAge: number | null;
  fireNumber: number;
  label: string;
}

export function runSensitivity(
  inputs: FireInputs,
  key: SensitivityKey,
  steps = 7
): SensitivityPoint[] {
  const ranges: Record<SensitivityKey, [number, number]> = {
    expectedReturn: [0.04, 0.12],
    retirementSpending: [inputs.retirementSpending * 0.6, inputs.retirementSpending * 1.4],
    withdrawalRate: [0.03, 0.05],
    currentSpending: [inputs.currentSpending * 0.6, inputs.currentSpending * 1.4],
    afterTaxIncome: [inputs.afterTaxIncome * 0.7, inputs.afterTaxIncome * 1.3],
  };

  const [min, max] = ranges[key];
  const points: SensitivityPoint[] = [];

  for (let i = 0; i < steps; i++) {
    const value = min + ((max - min) * i) / (steps - 1);
    const result = calculateFire({ ...inputs, [key]: value });
    const pct = key === "expectedReturn" || key === "withdrawalRate"
      ? `${(value * 100).toFixed(1)}%`
      : `$${Math.round(value / 1000)}k`;
    points.push({
      value,
      fireAge: result.fireAge,
      fireNumber: result.fireNumber,
      label: pct,
    });
  }

  return points;
}
