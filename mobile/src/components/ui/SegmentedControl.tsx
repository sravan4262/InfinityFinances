import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { label: string; value: T; disabled?: boolean }[];
  onChange: (value: T) => void;
  scrollable?: boolean;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  scrollable = options.length > 4,
  disabled
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const content = options.map((option) => {
    const active = option.value === value;
    const optionDisabled = disabled || option.disabled;

    return (
      <Pressable
        key={option.value}
        disabled={optionDisabled}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.option,
          scrollable ? styles.optionScrollable : styles.optionEqual,
          active ? styles.optionActive : null,
          pressed && !optionDisabled ? styles.optionPressed : null,
          optionDisabled ? styles.optionDisabled : null
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[styles.label, active ? styles.labelActive : null]}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollRoot}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.root}>{content}</View>
      </ScrollView>
    );
  }

  return <View style={styles.root}>{content}</View>;
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  scrollRoot: {
    marginHorizontal: -2
  },
  scrollContent: {
    paddingHorizontal: 2
  },
  root: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 4,
    gap: 4
  },
  option: {
    minHeight: 40,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 12
  },
  optionEqual: {
    flex: 1,
    minWidth: 0
  },
  optionScrollable: {
    flex: 0
  },
  optionActive: {
    backgroundColor: colors.card
  },
  optionPressed: {
    opacity: 0.78
  },
  optionDisabled: {
    opacity: 0.5
  },
  label: {
    color: colors.mutedForeground,
    fontWeight: "800",
    fontSize: 13
  },
  labelActive: {
    color: colors.foreground
  }
});
