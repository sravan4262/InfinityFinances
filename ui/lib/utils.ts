import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FireCurrency } from "./engine/types";
import { getFireCurrency } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, compact = false, currency?: FireCurrency): string {
  if (!isFinite(value) || isNaN(value)) return "—";
  const config = getFireCurrency(currency);
  if (compact) {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.label,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.label,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
