import { useCallback, useMemo } from "react";
import { useSegments } from "expo-router";
import { useFireStore } from "@/lib/store";
import { useChatContextStore } from "@/lib/chatContextStore";
import type { ChatArea } from "@/lib/api/chat";
import type { AssetClass, FireInputs } from "@/lib/engine/types";
import { FIRE_ENGINE_DEFAULTS } from "@/lib/fireDefaults";

export interface ChatAreaState {
  area: ChatArea | null;
  context: Record<string, unknown> | null;
  enabled: boolean;
  disabledReason: string | null;
  applyExtracted: (extracted: Record<string, unknown>) => void;
}

// Resolves the chat area from the active expo-router segments. The mobile
// app uses tab routes — `retire`, `home`, `budget`, `tracker` — plus a
// launcher/auth/chat-deep-link surface that should hide the FAB.
export function useChatArea(): ChatAreaState {
  const segments = useSegments();
  const hasResults = useFireStore((s) => s.hasResults);
  const updateInputs = useFireStore((s) => s.updateInputs);
  const inputs = useFireStore((s) => s.inputs);
  const retirementCtx = useChatContextStore((s) => s.retirement);
  const homeCtx = useChatContextStore((s) => s.home);
  const budgetCtx = useChatContextStore((s) => s.budget);

  const area: ChatArea | null = useMemo(() => {
    const tabSegmentIdx = segments.findIndex((s) => s === "(tabs)");
    if (tabSegmentIdx === -1) return null;
    const tab = segments[tabSegmentIdx + 1];
    if (tab === "retire") return "retirement";
    if (tab === "home") return "home";
    if (tab === "budget") return "budget";
    return null;
  }, [segments]);

  const { context, enabled, disabledReason } = useMemo(() => {
    if (area === "retirement") {
      return {
        context: retirementCtx,
        enabled: hasResults,
        disabledReason: hasResults
          ? null
          : "Run the calculator first so we can talk about your plan.",
      };
    }
    if (area === "home") {
      const hasInputs = homeCtx !== null && Object.keys(homeCtx).length > 0;
      return {
        context: homeCtx,
        enabled: hasInputs,
        disabledReason: hasInputs
          ? null
          : "Enter a price and rate to discuss your options.",
      };
    }
    if (area === "budget") {
      return { context: budgetCtx, enabled: true, disabledReason: null };
    }
    return { context: null, enabled: false, disabledReason: null };
  }, [area, retirementCtx, homeCtx, budgetCtx, hasResults]);

  const applyExtracted = useCallback(
    (extracted: Record<string, unknown>) => {
      if (area === "retirement") {
        const allowed: (keyof FireInputs)[] = [
          "currentAge",
          "currency",
          "retirementAge",
          "afterTaxIncome",
          "currentSpending",
          "currentPortfolio",
          "retirementSpending",
          "monthlyRetirementSalary",
          "expectedReturn",
          "grossIncome",
          "socialSecurityBenefit",
          "socialSecurityAge",
          "healthcarePremium",
          "lifeExpectancy",
          "inflationRate",
          "withdrawalRate",
          "healthcareInflation",
        ];
        const patch: Partial<FireInputs> = {};
        for (const k of allowed) {
          const v = extracted[k];
          if (typeof v === "number" && Number.isFinite(v)) {
            (patch as Record<string, number>)[k] = v;
          }
          if (k === "currency" && (v === "USD" || v === "INR")) {
            patch.currency = v;
          }
        }
        const normalized = normalizeRetirementPatch(patch, inputs);
        if (Object.keys(normalized).length > 0) updateInputs(normalized);
      }
    },
    [area, inputs, updateInputs]
  );

  return { area, context, enabled, disabledReason, applyExtracted };
}

function normalizeRetirementPatch(
  patch: Partial<FireInputs>,
  current: FireInputs
): Partial<FireInputs> {
  const out: Partial<FireInputs> = { ...patch };

  if (
    out.monthlyRetirementSalary !== undefined &&
    out.retirementSpending === undefined
  ) {
    out.retirementSpending = out.monthlyRetirementSalary * 12;
  } else if (
    out.retirementSpending !== undefined &&
    out.monthlyRetirementSalary === undefined
  ) {
    out.monthlyRetirementSalary = out.retirementSpending / 12;
  }

  const nextExpectedReturn =
    out.expectedReturn ?? current.expectedReturn ?? FIRE_ENGINE_DEFAULTS.expectedReturn;

  if (out.currentPortfolio !== undefined) {
    const firstAsset = current.assets[0];
    out.assets = [
      {
        label: firstAsset?.label ?? "Stocks / Equity",
        value: out.currentPortfolio,
        annualReturn: nextExpectedReturn || FIRE_ENGINE_DEFAULTS.expectedReturn,
        accountType: firstAsset?.accountType ?? "taxable",
      },
    ];
  } else if (out.expectedReturn !== undefined && current.assets.length > 0) {
    out.assets = current.assets.map((asset: AssetClass, index: number) =>
      index === 0 ? { ...asset, annualReturn: out.expectedReturn! } : asset
    );
  }

  return out;
}
