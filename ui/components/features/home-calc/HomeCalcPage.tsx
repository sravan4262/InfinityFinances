"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, ChevronDown, Check, Loader2, Home, TrendingDown, DollarSign, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { homeCalcApi, type HomeCalcProfile } from "@/lib/api/homeCalc";
import { BreakEvenCalc } from "./BreakEvenCalc";
import { MortgageCalc } from "./MortgageCalc";
import { AffordabilityCalc } from "./AffordabilityCalc";
import { BuyingGuide } from "./BuyingGuide";
import { useChatContextStore } from "@/lib/chatContextStore";
import type { BreakEvenInputs, MortgageInputs, AffordabilityInputs } from "./lib/types";

type SubTab = "break-even" | "mortgage" | "affordability" | "guide";

const TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "break-even",    label: "Break-Even",    icon: <TrendingDown className="w-3.5 h-3.5" /> },
  { id: "mortgage",      label: "Mortgage",      icon: <Home className="w-3.5 h-3.5" /> },
  { id: "affordability", label: "Affordability", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: "guide",         label: "Buying Guide",  icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export function HomeCalcPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("break-even");

  // Per-calculator inputs (lifted so HomeCalcPage can serialize them for save)
  const [breakEvenInputs, setBreakEvenInputs] = useState<BreakEvenInputs | undefined>(undefined);
  const [mortgageInputs, setMortgageInputs] = useState<MortgageInputs | undefined>(undefined);
  const [affordabilityInputs, setAffordabilityInputs] = useState<AffordabilityInputs | undefined>(undefined);

  // Auth + persistence state
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<HomeCalcProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  // Detect auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  // Publish current home-calc inputs to the global chat context so the
  // single ChatLauncher in app/layout can pick them up.
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);
  useEffect(() => {
    const payload: Record<string, unknown> = { activeTab };
    if (breakEvenInputs) payload.breakEven = breakEvenInputs as unknown as Record<string, unknown>;
    if (mortgageInputs) payload.mortgage = mortgageInputs as unknown as Record<string, unknown>;
    if (affordabilityInputs) payload.affordability = affordabilityInputs as unknown as Record<string, unknown>;
    setChatContext("home", payload);
    return () => clearChatContext("home");
  }, [activeTab, breakEvenInputs, mortgageInputs, affordabilityInputs, setChatContext, clearChatContext]);

  // Load profiles when logged in
  useEffect(() => {
    if (!userId) return;
    homeCalcApi.list().then((list) => {
      setProfiles(list);
      if (list.length > 0 && !activeProfileId) {
        loadProfile(list[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadProfile = useCallback((profile: HomeCalcProfile) => {
    setActiveProfileId(profile.id);
    if (profile.break_even) setBreakEvenInputs(profile.break_even);
    if (profile.mortgage) setMortgageInputs(profile.mortgage);
    if (profile.affordability) setAffordabilityInputs(profile.affordability);
    setProfileMenuOpen(false);
  }, []);

  const saveCurrentProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const patch = {
        breakEven: breakEvenInputs,
        mortgage: mortgageInputs,
        affordability: affordabilityInputs,
      };
      if (activeProfileId) {
        const updated = await homeCalcApi.update(activeProfileId, patch);
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const name = newProfileName.trim() || "My Home Profile";
        const created = await homeCalcApi.create(name, {
          break_even: breakEvenInputs ?? null,
          mortgage: mortgageInputs ?? null,
          affordability: affordabilityInputs ?? null,
        });
        setProfiles((prev) => [created, ...prev]);
        setActiveProfileId(created.id);
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch {
      // silently fail — user might not be logged in
    } finally {
      setSaving(false);
    }
  };

  const createNewProfile = async () => {
    if (!userId || !newProfileName.trim()) return;
    setCreatingNew(true);
    try {
      const created = await homeCalcApi.create(newProfileName.trim(), {
        break_even: null,
        mortgage: null,
        affordability: null,
      });
      setProfiles((prev) => [created, ...prev]);
      setActiveProfileId(created.id);
      setBreakEvenInputs(undefined);
      setMortgageInputs(undefined);
      setAffordabilityInputs(undefined);
      setNewProfileName("");
      setProfileMenuOpen(false);
    } catch {
      // silently fail
    } finally {
      setCreatingNew(false);
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Home Calculator</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Break-even analysis, mortgage math, affordability, and a buyer's guide — all in one place.
          </p>
        </div>

        {/* Save / profile controls */}
        {userId && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Profile picker */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
              >
                <span className="max-w-[120px] truncate">
                  {activeProfile?.name ?? "No profile"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  {profiles.length > 0 && (
                    <div className="p-1 border-b border-border">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => loadProfile(p)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between hover:bg-muted/40 transition-colors ${p.id === activeProfileId ? "text-primary font-semibold" : ""}`}
                        >
                          <span className="truncate">{p.name}</span>
                          {p.id === activeProfileId && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-2 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">New profile</p>
                    <div className="flex gap-1.5">
                      <input
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createNewProfile()}
                        placeholder="Profile name"
                        className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border bg-input focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={createNewProfile}
                        disabled={!newProfileName.trim() || creatingNew}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {creatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={saveCurrentProfile}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedMsg ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {savedMsg ? "Saved!" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/40 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "break-even" && (
          <BreakEvenCalc
            inputs={breakEvenInputs}
            onInputsChange={setBreakEvenInputs}
          />
        )}
        {activeTab === "mortgage" && (
          <MortgageCalc
            inputs={mortgageInputs}
            onInputsChange={setMortgageInputs}
          />
        )}
        {activeTab === "affordability" && (
          <AffordabilityCalc
            inputs={affordabilityInputs}
            onInputsChange={setAffordabilityInputs}
          />
        )}
        {activeTab === "guide" && <BuyingGuide />}
      </div>

      {/* Click-away for profile menu */}
      {profileMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
      )}
    </div>
  );
}
