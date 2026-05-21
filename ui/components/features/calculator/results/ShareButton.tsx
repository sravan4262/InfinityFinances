"use client";
import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import type { FireResults, FireInputs } from "@/lib/engine/types";
import { formatCurrency, formatPct } from "@/lib/utils";

interface Props {
  results: FireResults;
  inputs: FireInputs;
}

function buildSummary(results: FireResults, inputs: FireInputs): string {
  const fireAgeStr = results.fireAge ? `Age ${results.fireAge}` : "Not yet reached";
  const depletionStr = results.depletionAge ? `Age ${results.depletionAge}` : `${inputs.lifeExpectancy}+`;
  const monthlyTarget = inputs.monthlyRetirementSalary ?? inputs.retirementSpending / 12;
  const currency = inputs.currency ?? "USD";

  const lines = [
    "🔥 FIRE Projection Summary",
    "─────────────────────────",
    `FIRE number:       ${formatCurrency(results.fireNumber, false, currency)}`,
    `Retire at:         ${fireAgeStr}`,
    `Years to FIRE:     ${results.yearsToFire != null ? `${results.yearsToFire} years` : "—"}`,
    `Savings rate:      ${formatPct(results.currentSavingsRate)}`,
    `Monthly target:    ${formatCurrency(monthlyTarget, false, currency)}/mo`,
    `PV corpus needed:  ${formatCurrency(results.requiredCorpusPV, false, currency)}`,
    `Money lasts until: ${depletionStr}`,
    "─────────────────────────",
    `Lean FIRE:    ${formatCurrency(results.leanFireNumber, false, currency)}`,
    `Standard:     ${formatCurrency(results.fireNumber, false, currency)}`,
    `Barista FIRE: ${formatCurrency(results.baristaFireNumber, false, currency)}`,
    `Fat FIRE:     ${formatCurrency(results.fatFireNumber, false, currency)}`,
    `Coast FIRE:   ${formatCurrency(results.coastFireNumber, false, currency)}`,
    "─────────────────────────",
    "Calculated with Infinity Finances",
  ];
  return lines.join("\n");
}

export function ShareButton({ results, inputs }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildSummary(results, inputs);
    const title = "My FIRE Projection";

    // Try native Web Share API first (great on mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // User cancelled or unsupported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Last resort: create textarea and execCommand
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-1.5 transition-colors"
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5 text-success" /> Copied!</>
      ) : (
        <><Share2 className="w-3.5 h-3.5" /> Share</>
      )}
    </button>
  );
}
