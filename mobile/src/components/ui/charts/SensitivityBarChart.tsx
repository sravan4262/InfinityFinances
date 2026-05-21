import { StyleSheet, Text, View } from "react-native";
import type { SensitivityPoint } from "@/lib/engine/sensitivity";
import { useTheme } from "@/theme/ThemeProvider";

export function SensitivityBarChart({
  points,
  baseAge
}: {
  points: SensitivityPoint[];
  baseAge: number | null;
}) {
  const { colors } = useTheme();
  const ages = points.map((point) => point.fireAge ?? baseAge ?? 0).filter((age) => age > 0);
  const min = Math.min(...ages, baseAge ?? ages[0] ?? 0);
  const max = Math.max(...ages, baseAge ?? ages[0] ?? 1);

  return (
    <View style={styles.wrap}>
      {points.map((point) => {
        const age = point.fireAge ?? max;
        const ratio = max > min ? (age - min) / (max - min) : 0.5;
        const better = baseAge !== null && point.fireAge !== null && point.fireAge <= baseAge;
        return (
          <View key={point.value} style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{point.label}</Text>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
              <View style={[styles.bar, { width: `${Math.max(8, ratio * 100)}%`, backgroundColor: better ? colors.success : colors.destructive }]} />
            </View>
            <Text style={[styles.value, { color: colors.foreground }]}>{point.fireAge ? `Age ${point.fireAge}` : "No FIRE"}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 999,
    height: "100%"
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    width: 52
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  track: {
    borderRadius: 999,
    flex: 1,
    height: 10,
    overflow: "hidden"
  },
  value: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    width: 66
  },
  wrap: {
    gap: 10
  }
});
