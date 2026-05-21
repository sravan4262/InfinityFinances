import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { Screen } from "@/components/ui/Screen";
import { AuthButton } from "@/components/layout/AuthButton";
import { totalsByKind, txInMonth } from "@/lib/money/selectors";
import { todayYmd } from "@/lib/money/recurrence";
import { useMoneyStore } from "@/lib/money/store";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { useHomeCalcStore } from "@/features/home-calc/store";
import { calcAllAffordabilityScenarios } from "@/features/home-calc/math";

type LauncherCard = {
  key: string;
  label: string;
  title: string;
  supporting: string;
  metric: string;
  route: "/retire" | "/home" | "/budget";
  accent: "primary" | "gold" | "success";
};

const BASE_CARDS: Omit<LauncherCard, "metric">[] = [
  { key: "retire", label: "Financial Independence", title: "Early Retirement", supporting: "When can you stop working?", route: "/retire", accent: "primary" },
  { key: "home", label: "Housing", title: "Home Mortgage", supporting: "Break-even, mortgage, and affordability calculators.", route: "/home", accent: "gold" },
  { key: "expense", label: "Cash Flow", title: "Expense", supporting: "Daily transactions, recurring costs, and monthly summaries.", route: "/budget", accent: "success" }
];

function relativePosition(index: number, activeIndex: number) {
  const raw = (index - activeIndex + BASE_CARDS.length) % BASE_CARDS.length;
  return raw === BASE_CARDS.length - 1 ? -1 : raw;
}

export function LauncherScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [activeIndex, setActiveIndex] = useState(0);
  const month = todayYmd().slice(0, 7);
  const transactions = useMoneyStore((state) => state.transactions);
  const affordability = useHomeCalcStore((state) => state.affordability);
  const totals = useMemo(() => totalsByKind(txInMonth(transactions, month)), [month, transactions]);
  const moderateAffordability = useMemo(() => calcAllAffordabilityScenarios(affordability)[1], [affordability]);
  const cards = useMemo<LauncherCard[]>(() => [
    { ...BASE_CARDS[0], metric: "Six numbers, one answer" },
    { ...BASE_CARDS[1], metric: `${formatCurrency(moderateAffordability.homePrice, true)} moderate range` },
    { ...BASE_CARDS[2], metric: `${formatCurrency(totals.income - totals.expense)} this month` }
  ], [moderateAffordability.homePrice, totals.expense, totals.income]);
  const animated = useRef(BASE_CARDS.map((_, index) => new Animated.Value(relativePosition(index, 0)))).current;

  useEffect(() => {
    Animated.parallel(animated.map((value, index) => Animated.timing(value, {
      toValue: relativePosition(index, activeIndex),
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }))).start();
  }, [activeIndex, animated]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -36) setActiveIndex((value) => (value + 1) % BASE_CARDS.length);
      if (gesture.dy > 36) setActiveIndex((value) => (value - 1 + BASE_CARDS.length) % BASE_CARDS.length);
    }
  }), []);

  return (
    <Screen scroll={false}>
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />
      <View style={styles.authBar}>
        <AuthButton />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Infinity Finances</Text>
        <Text style={styles.title}>Choose your next move.</Text>
        <Text style={styles.subtitle}>Swipe through the launcher, then drop into the tool you need.</Text>
      </View>
      <View style={styles.stack} {...panResponder.panHandlers}>
        {cards.map((card, index) => {
          const active = index === activeIndex;
          const position = animated[index];
          return (
            <Animated.View
              key={card.key}
              pointerEvents={active ? "auto" : "none"}
              style={[styles.cardWrap, {
                zIndex: active ? 3 : relativePosition(index, activeIndex) === -1 ? 2 : 1,
                opacity: position.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.72, 1, 0.72] }),
                transform: [
                  { translateY: position.interpolate({ inputRange: [-1, 0, 1], outputRange: [-82, 0, 82] }) },
                  { scale: position.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.93, 1, 0.93] }) }
                ]
              }]}
            >
              <Pressable onPress={() => router.push(card.route)} style={({ pressed }) => [styles.card, active ? styles.activeCard : styles.inactiveCard, pressed ? styles.pressedCard : null]}>
                <View style={styles.topline}><Text style={styles.chip}>{card.label}</Text><ArrowRight size={18} color={colors.mutedForeground} /></View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSupporting}>{card.supporting}</Text>
                <Text style={[styles.metric, { color: colors[card.accent] }]}>{card.metric}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.scrollCue}>Swipe up or down</Text>
        <View style={styles.dots}>{cards.map((card, index) => <View key={card.key} style={[styles.dot, index === activeIndex ? styles.activeDot : null]} />)}</View>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  ambientTop: { position: "absolute", top: -110, left: -30, width: 320, height: 320, borderRadius: 999, backgroundColor: colors.glowPrimarySoft },
  ambientBottom: { position: "absolute", right: -80, bottom: -90, width: 260, height: 260, borderRadius: 999, backgroundColor: colors.glowGoldSoft },
  authBar: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  header: { paddingTop: 12, gap: 8 },
  eyebrow: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: colors.foreground, fontSize: 30, lineHeight: 34, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, maxWidth: 300 },
  stack: { flex: 1, minHeight: 350, justifyContent: "center", marginVertical: 8 },
  cardWrap: { position: "absolute", left: 2, right: 2, alignSelf: "center" },
  card: { minHeight: 220, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 18, shadowColor: colors.background, shadowOpacity: 0.42, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  activeCard: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  inactiveCard: { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  pressedCard: { transform: [{ scale: 0.995 }] },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 34 },
  chip: { alignSelf: "flex-start", color: colors.mutedForeground, fontSize: 11, fontWeight: "800", borderRadius: 999, backgroundColor: colors.cardElevated, paddingHorizontal: 10, paddingVertical: 7 },
  cardTitle: { color: colors.foreground, fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.5 },
  cardSupporting: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 290 },
  metric: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4, marginTop: 20 },
  footer: { alignItems: "center", gap: 12, paddingBottom: 18 },
  scrollCue: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700" },
  dots: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.border },
  activeDot: { width: 20, backgroundColor: colors.primary }
});
