import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, LogIn, Pencil, Save, Share2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { plansApi } from "@/lib/api/plans";
import type { FireInputs } from "@/lib/engine/types";
import { useFireStore } from "@/lib/store";
import { useTheme } from "@/theme/ThemeProvider";

export function ResultsActionRow({
  inputs,
  onCertainty,
  onEdit,
  onShare
}: {
  inputs: FireInputs;
  onCertainty: () => void;
  onEdit: () => void;
  onShare: () => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { activePlanId, activePlanName, setActivePlan } = useFireStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    plansApi.isAuthenticated().then((hasSession) => {
      if (!cancelled) setAuthenticated(hasSession);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePlan = async () => {
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const planName = activePlanName || "Mobile Plan";
      const plan = activePlanId
        ? await plansApi.update(activePlanId, { name: planName, inputs })
        : await plansApi.create(planName, inputs);
      setActivePlan(plan.id, plan.name);
    } catch (e: any) {
      setError(e.message || "Could not save plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Action label="Check" icon={<BadgeCheck size={14} color={colors.primary} />} onPress={onCertainty} />
        <Action
          label={authenticated ? activePlanId ? "Update" : "Save" : "Sign in"}
          icon={authenticated ? <Save size={14} color={colors.primary} /> : <LogIn size={14} color={colors.primary} />}
          onPress={savePlan}
          disabled={saving}
        />
        <Action label="Edit" icon={<Pencil size={14} color={colors.primary} />} onPress={onEdit} />
        <Action label="Share" icon={<Share2 size={14} color={colors.primary} />} onPress={onShare} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  disabled
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}>
      {icon}
      <Text numberOfLines={1} style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  wrap: { gap: 6, marginTop: 12 },
  row: { flexDirection: "row", gap: 8 },
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6
  },
  disabled: { opacity: 0.65 },
  error: { color: colors.destructive, fontSize: 12, fontWeight: "700", textAlign: "center" },
  label: { color: colors.foreground, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }
});
