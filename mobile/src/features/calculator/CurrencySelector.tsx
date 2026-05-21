import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FIRE_CURRENCIES } from "@/lib/currency";
import { useFireStore } from "@/lib/store";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency } from "@/lib/engine/types";

export function CurrencySelector() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const inputs = useFireStore((state) => state.inputs);
  const updateInputs = useFireStore((state) => state.updateInputs);
  const [open, setOpen] = useState(false);
  const currency = inputs.currency ?? "USD";
  const selected = FIRE_CURRENCIES[currency];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Currency</Text>
          <Text style={styles.helper}>Amounts and presets use {selected.country}.</Text>
        </View>
      </View>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.select}>
        <Text style={styles.code}>{selected.symbol} {selected.label}</Text>
        <Text style={styles.chevron}>{open ? "Hide" : "Change"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {(Object.entries(FIRE_CURRENCIES) as Array<[FireCurrency, typeof FIRE_CURRENCIES[FireCurrency]]>).map(([code, cfg]) => (
            <Pressable
              key={code}
              onPress={() => {
                updateInputs({ currency: code });
                setOpen(false);
              }}
              style={[styles.option, currency === code ? styles.optionActive : null]}
            >
              <Text style={[styles.optionCode, currency === code ? styles.optionCodeActive : null]}>{cfg.symbol} {cfg.label}</Text>
              <Text style={styles.country}>{cfg.country}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 8
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  helper: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 3
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  select: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chevron: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  code: {
    color: colors.foreground,
    fontWeight: "900"
  },
  menu: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    overflow: "hidden"
  },
  option: {
    padding: 12,
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  optionActive: {
    backgroundColor: colors.primaryWash
  },
  optionCode: {
    color: colors.foreground,
    fontWeight: "900"
  },
  optionCodeActive: {
    color: colors.primary
  },
  country: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "700"
  }
});
