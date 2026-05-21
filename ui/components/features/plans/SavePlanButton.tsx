"use client";
import { useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { plansApi } from "@/lib/api/plans";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import type { FireInputs } from "@/lib/engine/types";
import { Trash2, X } from "lucide-react";
import type { SavedPlan } from "@/lib/api/plans";
import { useFireStore } from "@/lib/store";

interface Props {
  inputs: FireInputs;
}

export function SavePlanButton({ inputs }: Props) {
  const [state, setState] = useState<"idle" | "naming" | "saving" | "saved">("idle");
  const { user } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitPlans, setLimitPlans] = useState<SavedPlan[] | null>(null);
  const [duplicateNameOpen, setDuplicateNameOpen] = useState(false);
  const { activePlanId, activePlanName, loadPlan, calculate } = useFireStore();
  const limitModal = limitPlans && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 space-y-4">
        <div className="flex justify-between gap-3">
          <div>
            <p className="font-semibold">3-plan limit reached</p>
            <p className="text-sm text-muted-foreground">Delete one or keep using an existing plan.</p>
          </div>
          <button onClick={() => setLimitPlans(null)}><X className="w-4 h-4" /></button>
        </div>
        {limitPlans.map((plan) => (
          <div key={plan.id} className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm">{plan.name}</span>
            <div className="flex items-center gap-3">
              <button
                className="text-xs text-primary"
                onClick={() => {
                  loadPlan(plan.id, plan.name, plan.inputs);
                  calculate();
                  setLimitPlans(null);
                  setState("idle");
                }}
              >
                Use
              </button>
              <button
                className="text-destructive"
                onClick={async () => {
                  await plansApi.delete(plan.id);
                  setLimitPlans((current) => current ? current.filter((p) => p.id !== plan.id) : current);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const duplicateNameModal = duplicateNameOpen && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 space-y-4">
        <div className="flex justify-between gap-3">
          <div>
            <p className="font-semibold">Plan name already exists</p>
            <p className="text-sm text-muted-foreground">Choose a different name to keep each plan easy to find.</p>
          </div>
          <button onClick={() => setDuplicateNameOpen(false)}><X className="w-4 h-4" /></button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="Plan name…"
          className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => setDuplicateNameOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
            Save with new name
          </button>
        </div>
      </div>
    </div>
  );

  async function handleSave() {
    if (!name.trim()) return;
    setState("saving");
    setError(null);
    try {
      if (activePlanId) {
        await plansApi.update(activePlanId, { name: name.trim(), inputs });
      } else {
        await plansApi.create(name.trim(), inputs);
      }
      setDuplicateNameOpen(false);
      setState("saved");
      setTimeout(() => { setState("idle"); setName(""); }, 2500);
    } catch (e: any) {
      if (String(e.message).includes("up to 3 plans")) {
        setLimitPlans(await plansApi.list());
      } else if (String(e.message).includes("already have a plan with that name")) {
        setDuplicateNameOpen(true);
      }
      setError(e.message);
      setState("naming");
    }
  }

  if (state === "saved") {
    return (
      <button className="flex items-center gap-1.5 text-xs text-success border border-success/40 rounded-lg px-3 py-1.5">
        <Check className="w-3.5 h-3.5" /> Saved!
      </button>
    );
  }

  if (state === "naming") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setState("idle"); }}
            placeholder="Plan name…"
            className="text-xs rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="text-xs text-primary border border-primary/40 rounded-lg px-2.5 py-1.5 hover:bg-primary/10 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setState("idle")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
          {error && !duplicateNameOpen && <span className="text-[10px] text-destructive">{error}</span>}
        </div>
        {limitModal}
        {duplicateNameModal}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          if (!user) return router.push("/auth/login");
          setName(activePlanName ?? "");
          setState("naming");
        }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-2.5 transition-colors"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        {activePlanId ? "Update plan" : "Save plan"}
      </button>
      {limitModal}
      {duplicateNameModal}
    </>
  );
}
