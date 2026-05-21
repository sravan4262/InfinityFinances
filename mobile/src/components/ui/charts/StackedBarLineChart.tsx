import { useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { G, Line, Path, Rect } from "react-native-svg";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { ChartFrame, compactChartPadding, defaultChartPadding, getChartBounds, linePath, nearestIndexForX, scalePoint, type ChartPoint } from "./ChartFrame";
import { ChartTooltip } from "./Tooltip";

export interface StackedBarLinePoint {
  x: number;
  principal: number;
  interest: number;
  balance: number;
}

export function StackedBarLineChart({ points, height = 220, compact = false }: { points: StackedBarLinePoint[]; height?: number; compact?: boolean }) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const linePoints = useMemo<ChartPoint[]>(() => points.map((point) => ({ x: point.x, y: point.balance })), [points]);
  const bounds = useMemo(() => getChartBounds([...linePoints, ...points.map((point) => ({ x: point.x, y: point.principal + point.interest }))]), [linePoints, points]);
  if (!points.length) return null;
  const padding = compact ? compactChartPadding : defaultChartPadding;

  return (
    <ChartFrame dataLength={points.length} bounds={bounds} height={height} compact={compact}>
      {(width) => {
        const setFromX = (x: number) => setActiveIndex(nearestIndexForX(x, linePoints, bounds, width, padding));
        const gesture = Gesture.Simultaneous(
          Gesture.Tap().onStart((event) => runOnJS(setFromX)(event.x)),
          Gesture.Pan().onUpdate((event) => runOnJS(setFromX)(event.x))
        );
        const barWidth = Math.max(8, (width - padding.left - padding.right) / Math.max(1, points.length) * 0.52);
        const active = activeIndex !== null ? points[activeIndex] : null;
        const activePoint = active ? scalePoint({ x: active.x, y: active.balance }, bounds, width, height, padding) : null;

        return (
          <GestureDetector gesture={gesture}>
            <View style={{ height, width }}>
              <Svg width={width} height={height}>
                {points.map((point) => {
                  const total = point.principal + point.interest;
                  const x = scalePoint({ x: point.x, y: 0 }, bounds, width, height, padding).x - barWidth / 2;
                  const yTotal = scalePoint({ x: point.x, y: total }, bounds, width, height, padding).y;
                  const yPrincipal = scalePoint({ x: point.x, y: point.principal }, bounds, width, height, padding).y;
                  const baseline = scalePoint({ x: point.x, y: 0 }, bounds, width, height, padding).y;
                  return (
                    <G key={point.x}>
                      <Rect x={x} y={yPrincipal} width={barWidth} height={baseline - yPrincipal} rx={3} fill={colors.success} opacity={0.82} />
                      <Rect x={x} y={yTotal} width={barWidth} height={yPrincipal - yTotal} rx={3} fill={colors.destructive} opacity={0.78} />
                    </G>
                  );
                })}
                <Path d={linePath(linePoints, bounds, width, height, padding)} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {activePoint ? <Line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={height - padding.bottom} stroke={colors.mutedForeground} strokeWidth={1} opacity={0.45} /> : null}
              </Svg>
              {active && activePoint ? (
                <ChartTooltip
                  x={activePoint.x}
                  chartWidth={width}
                  title={`Year ${active.x}`}
                  rows={[
                    { label: "Principal", value: formatCurrency(active.principal, true), color: colors.success },
                    { label: "Interest", value: formatCurrency(active.interest, true), color: colors.destructive },
                    { label: "Balance", value: formatCurrency(active.balance, true), color: colors.primary }
                  ]}
                />
              ) : null}
            </View>
          </GestureDetector>
        );
      }}
    </ChartFrame>
  );
}
