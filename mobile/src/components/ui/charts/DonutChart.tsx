import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ slices, size = 156 }: { slices: DonutSlice[]; size?: number }) {
  const { colors } = useTheme();
  const [active, setActive] = useState<DonutSlice | null>(null);
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;

  let cursor = 0;
  const center = size / 2;
  const radius = center - 12;
  const circumference = 2 * Math.PI * radius;
  const selected = active ?? visible[0];

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.muted} strokeWidth={16} fill="none" />
        {visible.map((slice) => {
          const percent = slice.value / total;
          const dash = percent * circumference;
          const gap = circumference - dash;
          const rotation = (cursor / total) * 360 - 90;
          cursor += slice.value;
          return (
            <Circle
              key={slice.label}
              cx={center}
              cy={center}
              r={radius}
              stroke={slice.color}
              strokeWidth={active?.label === slice.label ? 19 : 16}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              origin={`${center}, ${center}`}
              rotation={rotation}
              onPress={() => setActive(slice)}
            />
          );
        })}
        <Rect x={center - 28} y={center - 28} width={56} height={56} rx={28} fill={colors.card} />
      </Svg>
      <View style={styles.centerLabel} pointerEvents="none">
        <Text style={[styles.centerValue, { color: selected.color }]}>{Math.round((selected.value / total) * 100)}%</Text>
        <Text style={[styles.centerText, { color: colors.mutedForeground }]} numberOfLines={1}>{selected.label}</Text>
      </View>
      <View style={styles.pills}>
        {visible.map((slice) => (
          <Pressable key={slice.label} onPress={() => setActive(slice)} style={[styles.pill, { borderColor: active?.label === slice.label ? slice.color : colors.border }]}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={[styles.pillText, { color: colors.foreground }]}>{formatCurrency(slice.value, true)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: {
    alignItems: "center",
    gap: 1,
    justifyContent: "center",
    position: "absolute",
    top: 53,
    width: "100%"
  },
  centerText: {
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 86,
    textAlign: "center"
  },
  centerValue: {
    fontSize: 18,
    fontWeight: "900"
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  pill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800"
  },
  wrap: {
    alignItems: "center",
    alignSelf: "center",
    gap: 10,
    position: "relative"
  }
});
