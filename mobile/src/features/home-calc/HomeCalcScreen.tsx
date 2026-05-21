import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BookOpen, DollarSign, Home, Plus, Save, Trash2, TrendingDown } from "lucide-react-native";
import { TopBar } from "@/components/layout/TopBar";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useChatContextStore } from "@/lib/chatContextStore";
import { homeCalcApi, type HomeCalcProfile } from "@/lib/api/homeCalc";
import { useTheme } from "@/theme/ThemeProvider";
import { useUser } from "@/features/auth/useUser";
import { BuyingGuide } from "./BuyingGuide";
import { AffordabilityView } from "./AffordabilityView";
import { BreakEvenView } from "./BreakEvenView";
import { MortgageView } from "./MortgageView";
import { affordabilityDefaults, breakDefaults, mortgageDefaults, useHomeCalcStore } from "./store";

type Tab = "break-even" | "mortgage" | "affordability" | "guide";

export function HomeCalcScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("break-even");
  const [profiles, setProfiles] = useState<HomeCalcProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("My Home Profile");
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    breakEven,
    mortgage,
    affordability,
    loadProfileInputs
  } = useHomeCalcStore();
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);

  useEffect(() => {
    setChatContext("home", {
      activeTab: tab,
      breakEven: breakEven as unknown as Record<string, unknown>,
      mortgage: mortgage as unknown as Record<string, unknown>,
      affordability: affordability as unknown as Record<string, unknown>
    });
    return () => clearChatContext("home");
  }, [tab, breakEven, mortgage, affordability, setChatContext, clearChatContext]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfiles([]);
      setActiveId(null);
      return;
    }
    setLoadingProfiles(true);
    homeCalcApi.list()
      .then((items) => {
        if (cancelled) return;
        setProfiles(items);
        if (items[0]) loadProfile(items[0]);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const homeTabs: { label: string; value: Tab; icon: typeof TrendingDown }[] = [
    { label: "Break-Even", value: "break-even", icon: TrendingDown },
    { label: "Mortgage", value: "mortgage", icon: Home },
    { label: "Affordability", value: "affordability", icon: DollarSign },
    { label: "Buying Guide", value: "guide", icon: BookOpen }
  ];

  const loadProfile = (profile: HomeCalcProfile) => {
    setActiveId(profile.id);
    setProfileName(profile.name);
    loadProfileInputs({
      breakEven: profile.break_even,
      mortgage: profile.mortgage,
      affordability: profile.affordability
    });
  };

  const newProfile = () => {
    setActiveId(null);
    setProfileName("My Home Profile");
    loadProfileInputs({ breakEven: breakDefaults, mortgage: mortgageDefaults, affordability: affordabilityDefaults });
    setProfileSheetOpen(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const name = profileName.trim() || "My Home Profile";
      const saved = activeId
        ? await homeCalcApi.update(activeId, { name, breakEven, mortgage, affordability })
        : await homeCalcApi.create(name, { break_even: breakEven, mortgage, affordability });
      setProfiles((current) => activeId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setActiveId(saved.id);
      setProfileName(saved.name);
      setProfileSheetOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async (profile: HomeCalcProfile) => {
    Alert.alert("Delete profile?", profile.name, [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await homeCalcApi.delete(profile.id);
            setProfiles((current) => current.filter((item) => item.id !== profile.id));
            if (activeId === profile.id) newProfile();
          } catch (e: any) {
            setError(e.message);
          }
        }
      }
    ]);
  };

  return (
    <Screen>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Break-even, mortgage, affordability, and buyer guidance.</Text>
      </View>

      {user ? (
        <View style={styles.profileBox}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>Profiles</Text>
            <Pressable onPress={newProfile} style={styles.iconText}><Plus size={15} color={colors.primary}/><Text style={styles.link}>New</Text></Pressable>
          </View>
          <Pressable onPress={() => setProfileSheetOpen(true)} style={styles.profileSelectRow}>
            <View>
              <Text style={styles.listLabel}>Active profile</Text>
              <Text style={styles.value}>{profileName}</Text>
            </View>
            <Text style={styles.link}>{activeId ? "Edit" : "Save"}</Text>
          </Pressable>
          <View style={styles.profileChips}>
            {profiles.map((profile) => (
              <Pressable key={profile.id} onPress={() => loadProfile(profile)} onLongPress={() => deleteProfile(profile)} style={[styles.profileChip, profile.id === activeId ? styles.profileChipActive : null]}>
                <Text style={profile.id === activeId ? styles.profileChipTextActive : styles.profileChipText}>{profile.name}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : (
        <View style={styles.profileBox}><Text style={styles.subtitle}>Sign in to sync home profiles with the web app. Local calculator inputs still work.</Text></View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {homeTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.value;
          return (
            <Pressable key={item.value} onPress={() => setTab(item.value)} style={[styles.tabPill, active ? styles.tabPillActive : null]}>
              <Icon size={15} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={active ? styles.tabTextActive : styles.tabText}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === "break-even" ? <BreakEvenView /> : null}

      {tab === "mortgage" ? <MortgageView /> : null}

      {tab === "affordability" ? <AffordabilityView /> : null}

      {tab === "guide" ? <BuyingGuide /> : null}
      <BottomSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)}>
        <Text style={styles.sheetTitle}>{activeId ? "Update profile" : "Save profile"}</Text>
        <TextField label="Profile name" value={profileName} onChange={setProfileName} loading={loadingProfiles} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {activeId ? <AppButton label="Delete profile" variant="destructive" onPress={() => { const profile = profiles.find((item) => item.id === activeId); if (profile) deleteProfile(profile); }} icon={<Trash2 size={16} color={colors.primaryForeground}/>} /> : null}
        <AppButton label={activeId ? "Update profile" : "Save profile"} onPress={saveProfile} loading={saving} icon={<Save size={16} color={colors.primaryForeground}/>} />
      </BottomSheet>
    </Screen>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  header: { gap: 6, marginBottom: 14 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  profileBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, padding: 14, gap: 12, marginBottom: 14 },
  profileHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileSelectRow: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cardElevated, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  profileChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  profileChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  profileChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  profileChipText: { color: colors.foreground, fontWeight: "700", fontSize: 12 },
  profileChipTextActive: { color: colors.primaryForeground, fontWeight: "800", fontSize: 12 },
  iconText: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: colors.primary, fontWeight: "900" },
  error: { color: colors.destructive, fontSize: 12 },
  tabBar: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  tabPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  tabPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  tabText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  value: { color: colors.foreground, fontWeight: "900", fontSize: 16 },
  listLabel: { color: colors.mutedForeground, fontWeight: "700" }
});
