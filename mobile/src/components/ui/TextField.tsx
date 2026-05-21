import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  loading?: boolean;
  multiline?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  prefix,
  suffix,
  disabled,
  loading,
  multiline
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null, disabled ? styles.inputDisabled : null]}>
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled && !loading}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[styles.input, multiline ? styles.multiline : null]}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  inputWrap: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
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
  multiline: {
    minHeight: 92
  },
  affix: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: "600"
  },
  error: { color: colors.destructive, fontSize: 12, lineHeight: 16 },
  hint: { color: colors.mutedForeground, fontSize: 12, lineHeight: 16 }
});
