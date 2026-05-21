import type { FireCurrency } from "./engine/types";
import { getFireCurrency } from "./currency";

export function formatCurrency(value: number, compact = false, currency?: FireCurrency): string {
  if (!isFinite(value) || isNaN(value)) return "-";
  const config = getFireCurrency(currency);
  if (compact) {
    const formatted = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.label,
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
    if (looksCompact(formatted)) return formatted;
    return manualCompactCurrency(value, config);
  }
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.label,
    maximumFractionDigits: 0
  }).format(value);
}

function looksCompact(formatted: string): boolean {
  if (/[KMBT]/i.test(formatted)) return true;
  const digits = formatted.replace(/[^0-9]/g, "");
  return digits.length <= 4;
}

function manualCompactCurrency(value: number, config: { locale: string; label: string; symbol: string }): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const symbol = config.symbol ?? "$";
  if (abs < 1000) return `${sign}${symbol}${Math.round(abs)}`;
  const tiers = [
    { div: 1_000_000_000_000, suffix: "T" },
    { div: 1_000_000_000, suffix: "B" },
    { div: 1_000_000, suffix: "M" },
    { div: 1_000, suffix: "K" }
  ];
  for (const tier of tiers) {
    if (abs >= tier.div) {
      const n = abs / tier.div;
      const formatted = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(1);
      return `${sign}${symbol}${stripTrailingZero(formatted)}${tier.suffix}`;
    }
  }
  return `${sign}${symbol}${Math.round(abs)}`;
}

function stripTrailingZero(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
