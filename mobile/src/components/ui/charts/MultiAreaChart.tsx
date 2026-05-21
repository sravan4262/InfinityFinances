import { useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { ChartFrame, areaPath, compactChartPadding, defaultChartPadding, getChartBounds, linePath, nearestIndexForX, scalePoint, type ChartPoint } from "./ChartFrame";
import { ChartTooltip } from "./Tooltip";

export interface MultiAreaSeries {
  label: string;
  color: string;
  points: ChartPoint[];
  dashed?: boolean;
}

export function MultiAreaChart({
  series,
  height = 220,
  referenceY = 0,
  compact = false
}: {
  series: MultiAreaSeries[];
  height?: number;
  referenceY?: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visible = series.filter((item) => item.points.length > 0);
  const base = visible[0]?.points ?? [];
  const bounds = useMemo(() => getChartBounds(visible.flatMap((item) => item.points), [referenceY]), [referenceY, visible]);
  if (!visible.length) return null;
  const padding = compact ? compactChartPadding : defaultChartPadding;

  return (
    <ChartFrame dataLength={base.length} bounds={bounds} height={height} compact={compact}>
      {(width) => {
        const setFromX = (x: number) => setActiveIndex(nearestIndexForX(x, base, bounds, width, padding));
        const gesture = Gesture.Simultaneous(
          Gesture.Tap().onStart((event) => runOnJS(setFromX)(event.x)),
          Gesture.Pan().onUpdate((event) => runOnJS(setFromX)(event.x))
        );
        const activePoint = activeIndex !== null ? base[activeIndex] : null;
        const scaledActive = activePoint ? scalePoint(activePoint, bounds, width, height, padding) : null;
        const refY = scalePoint({ x: bounds.minX, y: referenceY }, bounds, width, height, padding).y;

        return (
          <GestureDetector gesture={gesture}>
            <View style={{ height, width }}>
              <Svg width={width} height={height}>
                <Defs>
                  {visible.map((item, index) => (
                    <LinearGradient key={item.label} id={`area-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={item.color} stopOpacity="0.22" />
                      <Stop offset="1" stopColor={item.color} stopOpacity="0.03" />
                    </LinearGradient>
                  ))}
                </Defs>
                <Line x1={padding.left} x2={width - padding.right} y1={refY} y2={refY} stroke={colors.gold} strokeWidth={1.5} strokeDasharray="6 5" />
                {visible.map((item, index) => (
                  <Path key={`${item.label}-fill`} d={areaPath(item.points, bounds, width, height, padding)} fill={`url(#area-${index})`} />
                ))}
                {visible.map((item) => (
                  <Path key={item.label} d={linePath(item.points, bounds, width, height, padding)} stroke={item.color} strokeWidth={2.5} strokeDasharray={item.dashed ? "6 5" : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {scaledActive ? <Line x1={scaledActive.x} x2={scaledActive.x} y1={padding.top} y2={height - padding.bottom} stroke={colors.mutedForeground} strokeWidth={1} opacity={0.45} /> : null}
              </Svg>
              {activePoint && scaledActive ? (
                <ChartTooltip
                  x={scaledActive.x}
                  chartWidth={width}
                  title={`Year ${activePoint.x}`}
                  rows={visible.map((item) => ({
                    label: item.label,
                    value: signedCurrency(item.points[activeIndex ?? 0]?.y ?? 0),
                    color: item.color
                  }))}
                />
              ) : null}
            </View>
          </GestureDetector>
        );
      }}
    </ChartFrame>
  );
}

function signedCurrency(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatCurrency(Math.abs(value), true)}`;
}
