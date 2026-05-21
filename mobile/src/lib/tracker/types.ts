export interface SavingsCategory {
  id: string;
  label: string;
  color: string; // oklch string
}

export interface MonthlyEntry {
  month: string; // "YYYY-MM"
  categoryId: string;
  planned: number;
  actual: number;
}

export interface MonthSummary {
  month: string;
  totalPlanned: number;
  totalActual: number;
  deviation: number; // actual - planned
}
