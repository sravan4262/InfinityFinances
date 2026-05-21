import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import type { FireInputs } from "@/lib/engine/types";
import { useFireStore } from "@/lib/store";
import { useTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatCurrency } from "@/lib/utils";

export function PlansPanel({
  inputs,
  compact = false,
  showSaveControl = true,
  showPlans = true
}: {
  inputs: FireInputs;
  compact?: boolean;
  showSaveControl?: boolean;
  showPlans?: boolean;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { activePlanId, activePlanName, loadPlan } = useFireStore();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [duplicateNameOpen, setDuplicateNameOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);

  useEffect(() => {
    let cancelled = false;

    plansApi.isAuthenticated().then((hasSession) => {
      if (cancelled) return;
      setAuthenticated(hasSession);
      if (!hasSession) return;

      setLoading(true);
      plansApi.list()
        .then((items) => {
          if (!cancelled) setPlans(items);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => setName(activePlanName ?? ""), [activePlanName]);

  const save = async () => {
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }

    try {
      const planName = name.trim() || `Plan ${plans.length + 1}`;
      if (activePlanId) {
        const updated = await plansApi.update(activePlanId, { name: planName, inputs });
        setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
      } else {
        const created = await plansApi.create(planName, inputs);
        setPlans((current) => [created, ...current]);
      }
      setDuplicateNameOpen(false);
      setError(null);
    } catch (e: any) {
      if (String(e.message).includes("up to 3 plans")) setLimitOpen(true);
      if (String(e.message).includes("already have a plan with that name")) setDuplicateNameOpen(true);
      setError(e.message);
    }
  };
  const remove = async () => {
    if (!planToDelete) return;
    await plansApi.delete(planToDelete.id);
    setPlans((current) => current.filter((item) => item.id !== planToDelete.id));
    setPlanToDelete(null);
  };

  return <View style={{ gap: 10 }}>
    {!authenticated ? (
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          Sign in only when you want to save or sync plans.
        </Text>
        <Pressable onPress={() => router.push("/auth/login")}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>Sign in to save</Text>
        </Pressable>
      </View>
    ) : null}
    {authenticated && !compact ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{plans.length}/3 saved</Text> : null}
    {showSaveControl ? (
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={activePlanId ? "Plan name" : "New plan name"}
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, color: colors.foreground }}
        />
        <Pressable onPress={save} style={{ justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>
            {!authenticated ? "Sign in" : activePlanId ? "Update" : "Save"}
          </Text>
        </Pressable>
      </View>
    ) : null}
    {authenticated && loading ? <Text style={{ color: colors.mutedForeground }}>Loading plans…</Text> : null}
    {authenticated && error && !duplicateNameOpen ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
    {authenticated && showPlans && !loading && !plans.length ? <Text style={{ color: colors.mutedForeground }}>No saved plans yet.</Text> : null}
    {authenticated && showPlans ? plans.map((plan) => {
      const monthlySavings = Math.max(0, (plan.inputs.afterTaxIncome - plan.inputs.currentSpending) / 12);
      return <View key={plan.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
        <Pressable onPress={() => loadPlan(plan.id, plan.name, plan.inputs)}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>{plan.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Retire at {plan.inputs.retirementAge || "—"} · {formatCurrency(monthlySavings, false, plan.inputs.currency)}/mo saved</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Pressable onPress={() => loadPlan(plan.id, plan.name, plan.inputs)}><Text style={{ color: colors.primary }}>Edit</Text></Pressable>
          <Pressable onPress={() => setPlanToDelete(plan)}><Text style={{ color: colors.destructive }}>Delete</Text></Pressable>
        </View>
      </View>;
    }) : null}
    <BottomSheet open={limitOpen} onClose={() => setLimitOpen(false)}>
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 18 }}>3-plan limit reached</Text>
      <Text style={{ color: colors.mutedForeground }}>Delete one or keep using an existing plan.</Text>
      {plans.map((plan) => <View key={plan.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
        <Pressable onPress={() => { loadPlan(plan.id, plan.name, plan.inputs); setLimitOpen(false); }}>
          <Text style={{ color: colors.foreground }}>{plan.name}</Text>
        </Pressable>
        <Pressable onPress={() => setPlanToDelete(plan)}>
          <Text style={{ color: colors.destructive }}>Delete</Text>
        </Pressable>
      </View>)}
    </BottomSheet>
    <BottomSheet open={!!planToDelete} onClose={() => setPlanToDelete(null)}>
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 18 }}>
        Delete {planToDelete?.name}?
      </Text>
      <Text style={{ color: colors.mutedForeground }}>This removes the saved plan permanently.</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 18 }}>
        <Pressable onPress={() => setPlanToDelete(null)}>
          <Text style={{ color: colors.mutedForeground, fontWeight: "800" }}>Cancel</Text>
        </Pressable>
        <Pressable onPress={remove}>
          <Text style={{ color: colors.destructive, fontWeight: "900" }}>Delete plan</Text>
        </Pressable>
      </View>
    </BottomSheet>
    <BottomSheet open={duplicateNameOpen} onClose={() => setDuplicateNameOpen(false)}>
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 18 }}>Plan name already exists</Text>
      <Text style={{ color: colors.mutedForeground }}>Choose a different name to keep each plan easy to find.</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Plan name"
        placeholderTextColor={colors.mutedForeground}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.foreground }}
      />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16 }}>
        <Pressable onPress={() => setDuplicateNameOpen(false)}>
          <Text style={{ color: colors.mutedForeground, fontWeight: "800" }}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save}>
          <Text style={{ color: colors.primary, fontWeight: "900" }}>Save with new name</Text>
        </Pressable>
      </View>
    </BottomSheet>
  </View>;
}
