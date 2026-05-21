import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface SliderFieldProps {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

export function SliderField({ label, value, display, min, max, step, onChange, hint, error, disabled }: SliderFieldProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.wrap, disabled ? styles.disabled : null]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.display}>{display}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        onValueChange={onChange}
      />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{min}</Text>
        <Text style={styles.rangeText}>{max}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  wrap: { gap: 6 },
  disabled: { opacity: 0.62 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1
  },
  display: { color: colors.primary, fontWeight: "900" },
  rangeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  rangeText: { color: colors.mutedForeground, fontSize: 11 },
  error: { color: colors.destructive, fontSize: 12, lineHeight: 16 },
  hint: { color: colors.mutedForeground, fontSize: 12, lineHeight: 16 }
});
