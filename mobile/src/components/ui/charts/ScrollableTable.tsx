import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpandButton, FullscreenModal } from "@/components/ui/ExpandableCard";
import { useTheme } from "@/theme/ThemeProvider";

export interface TableColumn<Row> {
  label: string;
  width?: number;
  render: (row: Row) => string;
  color?: (row: Row) => string | undefined;
}

export function ScrollableTable<Row>({
  rows,
  stickyLabel,
  stickyValue,
  columns,
  title,
  subtitle,
  expandable,
  previewRows
}: {
  rows: Row[];
  stickyLabel: string;
  stickyValue: (row: Row) => string;
  columns: TableColumn<Row>[];
  title?: string;
  subtitle?: string;
  expandable?: boolean;
  previewRows?: number;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [fullscreen, setFullscreen] = useState(false);
  const previewCount = expandable && previewRows && previewRows < rows.length ? previewRows : rows.length;
  const previewSlice = rows.slice(0, previewCount);
  const truncated = previewCount < rows.length;

  const renderBody = (data: Row[]) => (
    <View style={styles.wrap}>
      <View style={styles.sticky}>
        <Text style={styles.head}>{stickyLabel}</Text>
        {data.map((row, index) => <Text key={index} style={styles.cell}>{stickyValue(row)}</Text>)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>{columns.map((column) => <Text key={column.label} style={[styles.headWide, { width: column.width ?? 104 }]}>{column.label}</Text>)}</View>
          {data.map((row, index) => (
            <View key={index} style={styles.row}>
              {columns.map((column) => <Text key={column.label} style={[styles.cellWide, { width: column.width ?? 104, color: column.color?.(row) ?? colors.foreground }]}>{column.render(row)}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (!title && !expandable) return renderBody(rows);

  return (
    <View style={styles.framed}>
      {title || expandable ? (
        <View style={styles.framedHeader}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.framedTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.framedSubtitle}>{subtitle}</Text> : null}
          </View>
          {expandable ? <ExpandButton onPress={() => setFullscreen(true)} /> : null}
        </View>
      ) : null}
      {renderBody(previewSlice)}
      {truncated ? (
        <Text style={styles.truncatedHint}>Showing {previewCount} of {rows.length} · tap Expand for all</Text>
      ) : null}
      {expandable ? (
        <FullscreenModal
          open={fullscreen}
          onClose={() => setFullscreen(false)}
          title={title ?? "Table"}
          subtitle={subtitle ?? `${rows.length} rows · swipe horizontally to see every column.`}
        >
          {renderBody(rows)}
        </FullscreenModal>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  cell: { color: colors.foreground, fontSize: 12, fontWeight: "800", minHeight: 36, paddingHorizontal: 10, paddingVertical: 10 },
  cellWide: { color: colors.foreground, fontSize: 12, fontWeight: "800", minHeight: 36, paddingHorizontal: 10, paddingVertical: 10 },
  framed: { gap: 8 },
  framedHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  framedSubtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  framedTitle: { color: colors.foreground, fontSize: 15, fontWeight: "900" },
  head: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", minHeight: 38, paddingHorizontal: 10, paddingVertical: 11 },
  headWide: { color: colors.mutedForeground, fontSize: 11, fontWeight: "900", minHeight: 38, paddingHorizontal: 10, paddingVertical: 11 },
  headerText: { flexShrink: 1, gap: 2 },
  row: { flexDirection: "row" },
  sticky: { backgroundColor: colors.cardElevated, borderRightColor: colors.border, borderRightWidth: 1, width: 72 },
  truncatedHint: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", paddingTop: 4, textAlign: "center" },
  wrap: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", overflow: "hidden" }
});
