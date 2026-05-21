"use client";
import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useFireStore } from "@/lib/store";
import { useChatContextStore } from "@/lib/chatContextStore";
import type { ChatArea } from "@/lib/api/chat";
import type { AssetClass, FireInputs } from "@/lib/engine/types";
import { FIRE_ENGINE_DEFAULTS } from "@/lib/fireDefaults";

export interface ChatAreaState {
  area: ChatArea | null;
  context: Record<string, unknown> | null;
  // Domain-specific flag: is the calculator in a state where the assistant
  // has anything to talk about? Drives the lit/dim styling on the FAB.
  enabled: boolean;
  // Tooltip shown when `enabled` is false but `area` is non-null.
  disabledReason: string | null;
  applyExtracted: (extracted: Record<string, unknown>) => void;
}

// Resolves the chat area from the current route + the FIRE store's tab
// state (the root page uses an in-store tab switcher rather than separate
// routes for the tracker / home / budget surfaces).
export function useChatArea(): ChatAreaState {
  const pathname = usePathname();
  const activeTab = useFireStore((s) => s.activeTab);
  const hasResults = useFireStore((s) => s.hasResults);
  const updateInputs = useFireStore((s) => s.updateInputs);
  const inputs = useFireStore((s) => s.inputs);
  const retirementCtx = useChatContextStore((s) => s.retirement);
  const homeCtx = useChatContextStore((s) => s.home);
  const budgetCtx = useChatContextStore((s) => s.budget);

  const area: ChatArea | null = useMemo(() => {
    if (!pathname) return null;
    if (pathname.startsWith("/money")) return "budget";
    if (pathname.startsWith("/plan")) return "retirement";
    if (pathname === "/") {
      if (activeTab === "home") return "home";
      if (activeTab === "expense") return "budget";
      if (activeTab === "tracker") return null;
      return "retirement";
    }
    return null;
  }, [pathname, activeTab]);

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
        // Keys that may legally land in `FireInputs` from the chat path.
        // The first block is what Gemini extracts from the user's prose;
        // the second block is the engine-required defaults the chat
        // Calculate flow stamps in alongside them (lifeExpectancy etc.).
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
      // Home + budget apply paths are handled inside the chat panel where it
      // has access to area-specific UI (AddTransactionSheet, sub-tab state).
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
