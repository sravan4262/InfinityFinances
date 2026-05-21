import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line, Text as SvgText } from "react-native-svg";
import type { FireCurrency } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

export interface ChartPoint {
  x: number;
  y: number;
  age?: number;
  year?: number;
}

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  xRange: number;
  yRange: number;
}

export const defaultChartPadding: ChartPadding = { top: 8, right: 16, bottom: 24, left: 56 };
export const compactChartPadding: ChartPadding = { top: 6, right: 12, bottom: 20, left: 48 };

export function getChartBounds(points: ChartPoint[], extraY: number[] = []): ChartBounds {
  const xs = points.map((point) => point.x);
  const ys = [...points.map((point) => point.y), ...extraY].filter(Number.isFinite);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const rawMinY = Math.min(...ys, 0);
  const rawMaxY = Math.max(...ys, 1);
  const yPad = Math.max((rawMaxY - rawMinY) * 0.08, rawMaxY * 0.02, 1);
  const minY = Math.min(0, rawMinY - yPad);
  const maxY = rawMaxY + yPad;

  return {
    minX,
    maxX,
    minY,
    maxY,
    xRange: maxX - minX || 1,
    yRange: maxY - minY || 1
  };
}

export function scalePoint(point: ChartPoint, bounds: ChartBounds, width: number, height: number, padding: ChartPadding) {
  return {
    x: padding.left + ((point.x - bounds.minX) / bounds.xRange) * (width - padding.left - padding.right),
    y: height - padding.bottom - ((point.y - bounds.minY) / bounds.yRange) * (height - padding.top - padding.bottom)
  };
}

export function linePath(points: ChartPoint[], bounds: ChartBounds, width: number, height: number, padding: ChartPadding) {
  return points
    .map((point, index) => {
      const scaled = scalePoint(point, bounds, width, height, padding);
      return `${index === 0 ? "M" : "L"} ${scaled.x.toFixed(2)} ${scaled.y.toFixed(2)}`;
    })
    .join(" ");
}

export function areaPath(points: ChartPoint[], bounds: ChartBounds, width: number, height: number, padding: ChartPadding) {
  if (!points.length) return "";
  const line = linePath(points, bounds, width, height, padding);
  const first = scalePoint(points[0], bounds, width, height, padding);
  const last = scalePoint(points[points.length - 1], bounds, width, height, padding);
  const baseline = height - padding.bottom;
  return `${line} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} L ${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

export function bandPath(
  lower: ChartPoint[],
  upper: ChartPoint[],
  bounds: ChartBounds,
  width: number,
  height: number,
  padding: ChartPadding
) {
  const upperPath = upper.map((point) => scalePoint(point, bounds, width, height, padding));
  const lowerPath = lower.map((point) => scalePoint(point, bounds, width, height, padding)).reverse();
  return [...upperPath, ...lowerPath].map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function yTicks(bounds: ChartBounds, count = 4) {
  return Array.from({ length: count }, (_, index) => bounds.minY + (bounds.yRange * index) / (count - 1));
}

export function nearestIndexForX(x: number, points: ChartPoint[], bounds: ChartBounds, width: number, padding: ChartPadding) {
  if (!points.length) return 0;
  const plotWidth = width - padding.left - padding.right;
  const ratio = Math.max(0, Math.min(1, (x - padding.left) / Math.max(1, plotWidth)));
  const valueX = bounds.minX + ratio * bounds.xRange;
  let best = 0;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(point.x - valueX);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export function ChartFrame({
  children,
  dataLength,
  bounds,
  currency,
  height = 220,
  minWidth,
  xLabelPrefix = "Age ",
  padding,
  compact = false
}: {
  children: (width: number) => ReactNode;
  dataLength: number;
  bounds: ChartBounds;
  currency?: FireCurrency;
  height?: number;
  minWidth?: number;
  xLabelPrefix?: string;
  padding?: ChartPadding;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const resolvedPadding = padding ?? (compact ? compactChartPadding : defaultChartPadding);
  const width = minWidth ?? Math.max(screenWidth - 32, dataLength > 18 ? dataLength * 24 + resolvedPadding.left + resolvedPadding.right : 0);
  const ticks = yTicks(bounds, compact ? 3 : 4).reverse();

  const xLabelIndices = compact
    ? [0, dataLength - 1].filter((value, index, all) => value >= 0 && all.indexOf(value) === index)
    : [0, Math.floor((dataLength - 1) / 2), dataLength - 1].filter((value, index, all) => value >= 0 && all.indexOf(value) === index);
  const labelFontSize = compact ? 9 : 10;

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={[styles.yAxis, { height, width: resolvedPadding.left, paddingTop: resolvedPadding.top, paddingBottom: resolvedPadding.bottom }]}>
        {ticks.map((tick) => (
          <Text key={tick} numberOfLines={1} style={[styles.yAxisLabel, { color: colors.mutedForeground, fontSize: labelFontSize }]}>
            {formatCurrency(tick, true, currency)}
          </Text>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width, height }}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {ticks.map((tick) => {
              const y = scalePoint({ x: bounds.minX, y: tick }, bounds, width, height, resolvedPadding).y;
              return (
                <Line
                  key={`grid-${tick}`}
                  x1={resolvedPadding.left}
                  x2={width - resolvedPadding.right}
                  y1={y}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              );
            })}
            {xLabelIndices.map((index) => {
              const x = resolvedPadding.left + ((width - resolvedPadding.left - resolvedPadding.right) * index) / Math.max(1, dataLength - 1);
              return (
                <SvgText key={`x-${index}`} x={x} y={height - 7} fill={colors.mutedForeground} fontSize={labelFontSize} fontWeight="700" textAnchor="middle">
                  {xLabelPrefix}{Math.round(bounds.minX + index)}
                </SvgText>
              );
            })}
          </Svg>
          {children(width)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative"
  },
  yAxis: {
    left: 0,
    justifyContent: "space-between",
    position: "absolute",
    top: 0,
    zIndex: 2
  },
  yAxisLabel: {
    fontWeight: "700",
    textAlign: "right"
  }
});
