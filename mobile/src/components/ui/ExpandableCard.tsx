import type { ReactNode } from "react";
import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Maximize2, X } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function ExpandButton({
  onPress,
  label = "Expand"
}: {
  onPress: () => void;
  label?: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable onPress={onPress} style={styles.expandButton} hitSlop={8}>
      <Maximize2 size={13} color={colors.primary} />
      <Text style={styles.expandText}>{label}</Text>
    </Pressable>
  );
}

export function FullscreenModal({
  open,
  onClose,
  title,
  subtitle,
  meta,
  footer,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <View style={styles.headerText}>
            <Text style={styles.modalTitle}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={18} color={colors.foreground} />
          </Pressable>
        </View>
        {meta ? <View style={styles.expandedMeta}>{meta}</View> : null}
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalBody}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.expandedFooter}>{footer}</View> : null}
      </SafeAreaView>
    </Modal>
  );
}

export function ExpandableCard({
  title,
  subtitle,
  meta,
  compact,
  expanded,
  expandedMeta,
  expandedFooter,
  expandLabel = "Expand"
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  compact: ReactNode;
  expanded: ReactNode;
  expandedMeta?: ReactNode;
  expandedFooter?: ReactNode;
  expandLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.headerActions}>
            {meta}
            <ExpandButton onPress={() => setOpen(true)} label={expandLabel} />
          </View>
        </View>
        {compact}
      </View>
      <FullscreenModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        meta={expandedMeta}
        footer={expandedFooter}
      >
        {expanded}
      </FullscreenModal>
    </>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 14
  },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  headerText: { flexShrink: 1, gap: 2 },
  headerActions: { alignItems: "flex-end", flexShrink: 0, gap: 8 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: "900" },
  subtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  expandButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  expandText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  modal: { backgroundColor: colors.background, flex: 1, gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  modalHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  modalTitle: { color: colors.foreground, fontSize: 20, fontWeight: "900" },
  closeButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  expandedMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalScroll: { flex: 1 },
  modalBody: { gap: 12, paddingBottom: 24 },
  expandedFooter: { paddingBottom: 12 }
});
