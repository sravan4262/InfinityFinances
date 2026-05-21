import { StyleSheet, Text, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency } from "@/lib/engine/types";

export function NominalSalaryCallout({
  todaysMonthly,
  nominalMonthly,
  retirementAge,
  currency
}: {
  todaysMonthly: number;
  nominalMonthly: number;
  retirementAge: number;
  currency: FireCurrency;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!nominalMonthly || nominalMonthly <= 0) return null;
  return (
    <View style={styles.callout}>
      <View style={styles.left}>
        <ArrowUpRight size={16} color={colors.gold} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            Today's <Text style={styles.todayValue}>{formatCurrency(todaysMonthly, true, currency)}/mo</Text> target =
          </Text>
          <Text style={styles.body}>Inflation-adjusted at age {retirementAge}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.nominal}>{formatCurrency(nominalMonthly, true, currency)}/mo</Text>
        <Text style={styles.body}>nominal</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  callout: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated, padding: 14 },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  right: { alignItems: "flex-end" },
  title: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  todayValue: { color: colors.primary, fontWeight: "900" },
  body: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  nominal: { color: colors.gold, fontSize: 17, fontWeight: "900" }
});
