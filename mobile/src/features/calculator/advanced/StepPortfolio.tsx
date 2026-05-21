import { Pressable, Text, View } from "react-native";
import { NumberField } from "@/components/ui/NumberField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SliderField } from "@/components/ui/SliderField";
import { TextField } from "@/components/ui/TextField";
import { getAssetPresets } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { FireCurrency, FireInputs } from "@/lib/engine/types";
import { makeStepStyles, PersonToggle, StepHeader, type Person } from "./shared";

export function StepPortfolio({
  activeInputs,
  activeUpdate,
  currency,
  currencySymbol,
  includeSpouse,
  person,
  setPerson
}: {
  activeInputs: FireInputs;
  activeUpdate: (patch: Partial<FireInputs>) => void;
  currency: FireCurrency;
  currencySymbol: string;
  includeSpouse: boolean;
  person: Person;
  setPerson: (value: Person) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStepStyles(colors);
  const assetPresets = getAssetPresets(currency);
  const totalAssets = activeInputs.assets.reduce((sum, asset) => sum + asset.value, 0);

  const addAsset = () => {
    const preset = assetPresets[0];
    activeUpdate({ assets: [...activeInputs.assets, { label: preset.label, value: 0, annualReturn: preset.annualReturn, accountType: preset.accountType }] });
  };
  const updateAsset = (index: number, patch: Partial<(typeof activeInputs.assets)[number]>) =>
    activeUpdate({ assets: activeInputs.assets.map((asset, i) => i === index ? { ...asset, ...patch } : asset) });
  const removeAsset = (index: number) =>
    activeInputs.assets.length > 1 && activeUpdate({ assets: activeInputs.assets.filter((_, i) => i !== index) });

  return (
    <>
      <StepHeader title="Portfolio" body="Start with your main asset bucket; finer asset-class editing can build from here." />
      {includeSpouse ? <PersonToggle value={person} onChange={setPerson} /> : null}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Current portfolio</Text>
        <Text style={styles.heroNumber}>{formatCurrency(totalAssets, false, currency)}</Text>
      </View>
      {activeInputs.assets.map((asset, index) => (
        <View key={index} style={styles.itemCard}>
          <TextField label="Asset name" value={asset.label} onChange={(label) => updateAsset(index, { label })} />
          <View style={styles.presetWrap}>
            {assetPresets.map((preset) => (
              <Pressable key={preset.label} onPress={() => updateAsset(index, { label: preset.label, annualReturn: preset.annualReturn, accountType: preset.accountType })} style={[styles.smallPill, asset.label === preset.label ? styles.pillActive : null]}>
                <Text style={asset.label === preset.label ? styles.pillTextActive : styles.pillText}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>
          <SegmentedControl
            value={asset.accountType ?? "taxable"}
            options={[{ label: "Taxable", value: "taxable" }, { label: "Roth", value: "roth" }, { label: "Traditional", value: "traditional" }]}
            onChange={(accountType) => updateAsset(index, { accountType })}
          />
          <NumberField label="Current value" value={asset.value} onChange={(value) => updateAsset(index, { value })} prefix={currencySymbol} format="currency" />
          <NumberField label="Annual return" value={asset.annualReturn} onChange={(annualReturn) => updateAsset(index, { annualReturn })} format="percent" suffix="%/yr" />
          <NumberField label="Monthly contribution" value={asset.monthlyContribution ?? 0} onChange={(monthlyContribution) => updateAsset(index, { monthlyContribution })} prefix={currencySymbol} format="currency" />
          {activeInputs.assets.length > 1 ? (
            <Pressable onPress={() => removeAsset(index)}>
              <Text style={styles.removeText}>Remove asset</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable onPress={addAsset} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>+ Add asset</Text>
      </Pressable>
      <SliderField label="Blended expected return" value={activeInputs.expectedReturn * 100} display={`${(activeInputs.expectedReturn * 100).toFixed(1)}%`} min={3} max={12} step={0.5} onChange={(value) => activeUpdate({ expectedReturn: value / 100 })} />
      <NumberField label="Inflation rate" value={activeInputs.inflationRate} onChange={(inflationRate) => activeUpdate({ inflationRate })} format="percent" suffix="%/yr" />
    </>
  );
}
