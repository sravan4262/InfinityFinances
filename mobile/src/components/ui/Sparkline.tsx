import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Polygon, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

type SeriesPoint = number | { x: number; y: number };

interface ChartSeries {
  values: SeriesPoint[];
  color: string;
  width?: number;
}

interface ChartBand {
  lower: number[];
  upper: number[];
  color?: string;
  opacity?: number;
}

const CHART_WIDTH = 320;

function normalizeValue(point: SeriesPoint, index: number) {
  return typeof point === "number" ? { x: index, y: point } : point;
}

function getBounds(series: SeriesPoint[][], bands: ChartBand[] = []) {
  const points = series.flatMap((values) => values.map(normalizeValue));
  const bandValues = bands.flatMap((band) => [...band.lower, ...band.upper]);
  const ys = [...points.map((point) => point.y), ...bandValues];
  const xs = points.map((point) => point.x);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);

  return {
    minY,
    maxY,
    minX,
    maxX,
    yRange: maxY - minY || 1,
    xRange: maxX - minX || 1
  };
}

function toPoint(point: { x: number; y: number }, bounds: ReturnType<typeof getBounds>, height: number, padding: number) {
  const x = padding + ((point.x - bounds.minX) / bounds.xRange) * (CHART_WIDTH - padding * 2);
  const y = height - padding - ((point.y - bounds.minY) / bounds.yRange) * (height - padding * 2);
  return { x, y };
}

function pathFromValues(values: SeriesPoint[], bounds: ReturnType<typeof getBounds>, height: number, padding: number) {
  return values
    .map((value, index) => {
      const point = toPoint(normalizeValue(value, index), bounds, height, padding);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function bandPoints(band: ChartBand, bounds: ReturnType<typeof getBounds>, height: number, padding: number) {
  const upper = band.upper.map((value, index) => toPoint({ x: index, y: value }, bounds, height, padding));
  const lower = band.lower.map((value, index) => toPoint({ x: index, y: value }, bounds, height, padding)).reverse();
  return [...upper, ...lower].map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function EmptyChart({ height }: { height: number }) {
  const { colors } = useTheme();
  return <View style={[styles.chart, { height, backgroundColor: colors.muted }]} />;
}

export function Sparkline({ values, color, height = 120 }: { values: number[]; color: string; height?: number }) {
  return <MultiLineChart series={[{ values, color, width: 3 }]} height={height} showGrid={false} />;
}

export function AreaChart({
  values,
  color,
  height = 150
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const lineColor = color ?? colors.chart1;
  if (!values.length) return <EmptyChart height={height} />;

  const padding = 8;
  const bounds = getBounds([values]);
  const linePath = pathFromValues(values, bounds, height, padding);
  const first = toPoint({ x: 0, y: values[0] }, bounds, height, padding);
  const last = toPoint({ x: values.length - 1, y: values[values.length - 1] }, bounds, height, padding);
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${height - padding} L ${first.x.toFixed(2)} ${height - padding} Z`;

  return (
    <View style={styles.chart}>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.24" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function MultiLineChart({
  series,
  height = 150,
  showGrid = true,
  markers = []
}: {
  series: ChartSeries[];
  height?: number;
  showGrid?: boolean;
  markers?: { x?: number; y?: number; color?: string }[];
}) {
  const { colors } = useTheme();
  const visibleSeries = series.filter((item) => item.values.length > 0);
  if (!visibleSeries.length) return <EmptyChart height={height} />;

  const padding = 8;
  const bounds = getBounds(visibleSeries.map((item) => item.values));
  const gridColor = colors.border;

  return (
    <View style={styles.chart}>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        {showGrid ? [0.25, 0.5, 0.75].map((tick) => <Line key={tick} x1={0} x2={CHART_WIDTH} y1={height * tick} y2={height * tick} stroke={gridColor} strokeWidth={1} />) : null}
        {markers.map((marker, index) => {
          if (marker.y !== undefined) {
            const y = toPoint({ x: bounds.minX, y: marker.y }, bounds, height, padding).y;
            return <Line key={`y-${index}`} x1={0} x2={CHART_WIDTH} y1={y} y2={y} stroke={marker.color ?? colors.gold} strokeWidth={1.5} strokeDasharray="5 5" />;
          }
          const x = toPoint({ x: marker.x ?? 0, y: bounds.minY }, bounds, height, padding).x;
          return <Line key={`x-${index}`} x1={x} x2={x} y1={padding} y2={height - padding} stroke={marker.color ?? colors.warning} strokeWidth={1.5} strokeDasharray="5 5" />;
        })}
        {visibleSeries.map((item, index) => (
          <Path
            key={`${item.color}-${index}`}
            d={pathFromValues(item.values, bounds, height, padding)}
            stroke={item.color}
            strokeWidth={item.width ?? 2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

export function PercentileBandChart({
  series,
  bands,
  height = 170
}: {
  series: ChartSeries[];
  bands: ChartBand[];
  height?: number;
}) {
  const { colors } = useTheme();
  const visibleSeries = series.filter((item) => item.values.length > 0);
  if (!visibleSeries.length && !bands.length) return <EmptyChart height={height} />;

  const padding = 8;
  const bounds = getBounds(visibleSeries.map((item) => item.values), bands);

  return (
    <View style={styles.chart}>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        {bands.map((band, index) => (
          <Polygon
            key={index}
            points={bandPoints(band, bounds, height, padding)}
            fill={band.color ?? colors.primary}
            opacity={band.opacity ?? 0.14}
          />
        ))}
        {visibleSeries.map((item, index) => (
          <Path
            key={`${item.color}-${index}`}
            d={pathFromValues(item.values, bounds, height, padding)}
            stroke={item.color}
            strokeWidth={item.width ?? 2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  height = 10
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={[styles.progressTrack, { height, backgroundColor: colors.muted }]}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

export function CategoryBreakdownChart({
  items,
  size = 132
}: {
  items: { value: number; color: string }[];
  size?: number;
}) {
  const { colors } = useTheme();
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  if (total <= 0) return <EmptyChart height={size} />;

  let cursor = 0;
  const center = size / 2;
  const radius = center - 8;

  return (
    <View style={[styles.chart, { alignSelf: "center" }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.muted} strokeWidth={14} fill="none" />
        {items.map((item, index) => {
          const percent = Math.max(0, item.value) / total;
          const circumference = 2 * Math.PI * radius;
          const dash = percent * circumference;
          const gap = circumference - dash;
          const rotation = (cursor / total) * 360 - 90;
          cursor += Math.max(0, item.value);
          return (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={item.color}
              strokeWidth={14}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              origin={`${center}, ${center}`}
              rotation={rotation}
            />
          );
        })}
        <Rect x={center - 18} y={center - 18} width={36} height={36} rx={18} fill={colors.card} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    overflow: "hidden",
    borderRadius: 12
  },
  progressTrack: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 999
  },
  progressFill: {
    height: "100%",
    borderRadius: 999
  }
});
