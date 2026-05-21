import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  format?: "number" | "currency" | "percent";
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}

function displayValue(value: number, format: NonNullable<NumberFieldProps["format"]>) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? "0" : "";
  if (format === "currency") return new Intl.NumberFormat("en-US").format(value);
  if (format === "percent") return (value * 100).toFixed(1);
  return String(value);
}

function parseValue(raw: string, format: NonNullable<NumberFieldProps["format"]>) {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return format === "percent" ? parsed / 100 : parsed;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  hint,
  min,
  max,
  format = "number",
  error,
  disabled,
  loading
}: NumberFieldProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(displayValue(value, format));

  useEffect(() => {
    if (!focused) setRaw(displayValue(value, format));
  }, [focused, format, value]);

  const commit = () => {
    setFocused(false);
    let next = parseValue(raw, format);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          value={raw}
          onChangeText={setRaw}
          onFocus={() => setFocused(true)}
          onBlur={commit}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          editable={!disabled && !loading}
          style={styles.input}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  inputFocused: {
    borderColor: colors.primary
  },
  inputError: { borderColor: colors.destructive },
  inputDisabled: { opacity: 0.62 },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 10
  },
  affix: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: "600"
  },
  error: { color: colors.destructive, fontSize: 12, lineHeight: 16 },
  hint: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 16
  }
});
