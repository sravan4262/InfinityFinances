import { useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Line, Path, Polygon, Stop } from "react-native-svg";
import type { FireCurrency, MonteCarloPercentileRow, YearlyRow } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import { ChartFrame, areaPath, bandPath, compactChartPadding, defaultChartPadding, getChartBounds, linePath, nearestIndexForX, scalePoint } from "./ChartFrame";
import { ChartTooltip } from "./Tooltip";

export function PortfolioAreaChart({
  rows,
  whatIfRows = [],
  monteCarloRows = [],
  fireNumber,
  retirementAge,
  currency,
  height = 220,
  minWidth,
  xLabelPrefix = "",
  showWhatIf = true,
  showMonteCarlo = true,
  compact = false
}: {
  rows: YearlyRow[];
  whatIfRows?: YearlyRow[];
  monteCarloRows?: MonteCarloPercentileRow[];
  fireNumber: number;
  retirementAge: number;
  currency?: FireCurrency;
  height?: number;
  minWidth?: number;
  xLabelPrefix?: string;
  showWhatIf?: boolean;
  showMonteCarlo?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const base = useMemo(() => rows.map((row) => ({ x: row.age, y: row.portfolio, age: row.age, year: row.year })), [rows]);
  const whatIf = useMemo(() => whatIfRows.map((row) => ({ x: row.age, y: row.portfolio, age: row.age, year: row.year })), [whatIfRows]);
  const p10 = useMemo(() => monteCarloRows.map((row) => ({ x: row.age, y: row.p10, age: row.age })), [monteCarloRows]);
  const p25 = useMemo(() => monteCarloRows.map((row) => ({ x: row.age, y: row.p25, age: row.age })), [monteCarloRows]);
  const p50 = useMemo(() => monteCarloRows.map((row) => ({ x: row.age, y: row.p50, age: row.age })), [monteCarloRows]);
  const p75 = useMemo(() => monteCarloRows.map((row) => ({ x: row.age, y: row.p75, age: row.age })), [monteCarloRows]);
  const p90 = useMemo(() => monteCarloRows.map((row) => ({ x: row.age, y: row.p90, age: row.age })), [monteCarloRows]);
  const bounds = useMemo(() => getChartBounds([...base, ...(showWhatIf ? whatIf : []), ...(showMonteCarlo ? [...p10, ...p90] : [])], [fireNumber]), [base, fireNumber, p10, p90, showMonteCarlo, showWhatIf, whatIf]);

  if (!base.length) return null;

  const padding = compact ? compactChartPadding : defaultChartPadding;

  return (
    <ChartFrame dataLength={base.length} bounds={bounds} currency={currency} height={height} minWidth={minWidth} xLabelPrefix={xLabelPrefix} compact={compact}>
      {(width) => {
        const setFromX = (x: number) => setActiveIndex(nearestIndexForX(x, base, bounds, width, padding));
        const gesture = Gesture.Simultaneous(
          Gesture.Tap().onStart((event) => runOnJS(setFromX)(event.x)),
          Gesture.Pan().onUpdate((event) => runOnJS(setFromX)(event.x))
        );
        const active = activeIndex !== null ? base[activeIndex] : null;
        const activePoint = active ? scalePoint(active, bounds, width, height, padding) : null;
        const activeWhatIf = showWhatIf && activeIndex !== null ? whatIf[activeIndex] : undefined;
        const activeMc = showMonteCarlo && active ? monteCarloRows.find((row) => row.age === active.age) : undefined;

        return (
          <GestureDetector gesture={gesture}>
            <View style={{ height, width }}>
              <Svg width={width} height={height}>
                <Defs>
                  <LinearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>
                {showMonteCarlo && p10.length && p90.length ? (
                  <Polygon points={bandPath(p10, p90, bounds, width, height, padding)} fill={colors.primary} opacity={0.08} />
                ) : null}
                {showMonteCarlo && p25.length && p75.length ? (
                  <Polygon points={bandPath(p25, p75, bounds, width, height, padding)} fill={colors.primary} opacity={0.16} />
                ) : null}
                <Path d={areaPath(base, bounds, width, height, padding)} fill="url(#portfolioFill)" />
                {showMonteCarlo && p50.length ? <Path d={linePath(p50, bounds, width, height, padding)} stroke={colors.primary} strokeWidth={1.5} strokeDasharray="5 5" fill="none" /> : null}
                {showWhatIf && whatIf.length ? <Path d={linePath(whatIf, bounds, width, height, padding)} stroke={colors.gold} strokeWidth={2.5} strokeDasharray="6 5" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
                <Path d={linePath(base, bounds, width, height, padding)} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Line x1={padding.left} x2={width - padding.right} y1={scalePoint({ x: bounds.minX, y: fireNumber }, bounds, width, height, padding).y} y2={scalePoint({ x: bounds.minX, y: fireNumber }, bounds, width, height, padding).y} stroke={colors.gold} strokeWidth={1.5} strokeDasharray="6 5" />
                <Line x1={scalePoint({ x: retirementAge, y: bounds.minY }, bounds, width, height, padding).x} x2={scalePoint({ x: retirementAge, y: bounds.minY }, bounds, width, height, padding).x} y1={padding.top} y2={height - padding.bottom} stroke={colors.primary} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                {activePoint ? <Line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={height - padding.bottom} stroke={colors.mutedForeground} strokeWidth={1} opacity={0.45} /> : null}
              </Svg>
              {active && activePoint ? (
                <ChartTooltip
                  x={activePoint.x}
                  chartWidth={width}
                  title={`Age ${active.age} · Year ${active.year ?? ""}`}
                  rows={[
                    { label: "Base", value: formatCurrency(active.y, true, currency), color: colors.primary },
                    ...(activeWhatIf ? [{ label: "What-if", value: formatCurrency(activeWhatIf.y, true, currency), color: colors.gold }, { label: "Delta", value: formatCurrency(activeWhatIf.y - active.y, true, currency), color: activeWhatIf.y >= active.y ? colors.success : colors.destructive }] : []),
                    ...(activeMc ? [{ label: "MC p10", value: formatCurrency(activeMc.p10, true, currency), color: colors.destructive }, { label: "MC p50", value: formatCurrency(activeMc.p50, true, currency), color: colors.primary }, { label: "MC p90", value: formatCurrency(activeMc.p90, true, currency), color: colors.success }] : [])
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
