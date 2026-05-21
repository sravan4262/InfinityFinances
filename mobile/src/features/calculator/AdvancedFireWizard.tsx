import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Flame } from "lucide-react-native";
import { AppButton } from "@/components/ui/AppButton";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/layout/TopBar";
import { useFireStore, type WizardStep } from "@/lib/store";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import { formatCurrency } from "@/lib/utils";
import { getFireCurrency } from "@/lib/currency";
import { useTheme } from "@/theme/ThemeProvider";
import { CurrencySelector } from "./CurrencySelector";
import { StepStrip } from "./advanced/StepStrip";
import { StepYou } from "./advanced/StepYou";
import { StepIncome } from "./advanced/StepIncome";
import { StepPortfolio } from "./advanced/StepPortfolio";
import { StepAdvanced } from "./advanced/StepAdvanced";
import { StepGoals } from "./advanced/StepGoals";
import type { Person } from "./advanced/shared";
import { advancedInputsReady, validateAdvancedStep, type AdvancedWizardErrors } from "./advanced/validation";

export function AdvancedFireWizard() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const {
    wizardStep,
    setWizardStep,
    inputs,
    updateInputs,
    includeSpouse,
    setIncludeSpouse,
    spouseInputs,
    updateSpouseInputs,
    calculate
  } = useFireStore();
  const [errors, setErrors] = useState<AdvancedWizardErrors>({});
  const [person, setPerson] = useState<Person>("you");
  const [highestUnlockedStep, setHighestUnlockedStep] = useState<WizardStep>(wizardStep);
  const clearErrors = () => setErrors({});

  const activeInputs = includeSpouse && person === "spouse" ? spouseInputs : inputs;
  const activeUpdate = includeSpouse && person === "spouse" ? updateSpouseInputs : updateInputs;
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;
  const ready = advancedInputsReady(inputs);
  const preview = useMemo(() => ready ? calculateFireMonthly(inputs) : null, [inputs, ready]);
  const validate = (step: WizardStep) => validateAdvancedStep(inputs, step, { includeSpouse, spouseInputs });
  const currentStepValid = Object.keys(validate(wizardStep)).length === 0;
  const showPreview = ready && currentStepValid;

  const next = () => {
    const stepErrors = validate(wizardStep);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    if (wizardStep === 4) {
      calculate();
      router.push("/retire/results");
    } else {
      const nextStep = (wizardStep + 1) as WizardStep;
      setHighestUnlockedStep((current) => Math.max(current, nextStep) as WizardStep);
      setWizardStep(nextStep);
    }
  };
  const back = () => {
    setErrors({});
    if (wizardStep > 0) setWizardStep((wizardStep - 1) as WizardStep);
  };
  const jumpToStep = (step: WizardStep) => {
    if (step > highestUnlockedStep) return;
    setErrors({});
    setWizardStep(step);
  };

  return (
    <Screen>
      <TopBar />
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <ArrowLeft size={16} color={colors.mutedForeground} />
        <Text style={styles.backText}>Simple calculator</Text>
      </Pressable>
      <Text style={styles.title}>Advanced FIRE wizard</Text>
      <CurrencySelector />
      <StepStrip wizardStep={wizardStep} highestUnlockedStep={highestUnlockedStep} onJump={jumpToStep} />
      <Card style={{ gap: 16 }}>
        {wizardStep === 0 ? (
          <StepYou
            inputs={inputs}
            updateInputs={updateInputs}
            errors={errors}
            clearErrors={clearErrors}
            includeSpouse={includeSpouse}
            setIncludeSpouse={setIncludeSpouse}
            spouseInputs={spouseInputs}
            updateSpouseInputs={updateSpouseInputs}
          />
        ) : null}
        {wizardStep === 1 ? (
          <StepIncome
            activeInputs={activeInputs}
            activeUpdate={activeUpdate}
            currencySymbol={currencySymbol}
            includeSpouse={includeSpouse}
            person={person}
            setPerson={setPerson}
            errors={errors}
            clearErrors={clearErrors}
          />
        ) : null}
        {wizardStep === 2 ? (
          <StepPortfolio
            activeInputs={activeInputs}
            activeUpdate={activeUpdate}
            currency={currency}
            currencySymbol={currencySymbol}
            includeSpouse={includeSpouse}
            person={person}
            setPerson={setPerson}
          />
        ) : null}
        {wizardStep === 3 ? (
          <StepAdvanced
            activeInputs={activeInputs}
            activeUpdate={activeUpdate}
            currencySymbol={currencySymbol}
            includeSpouse={includeSpouse}
            person={person}
            setPerson={setPerson}
          />
        ) : null}
        {wizardStep === 4 ? (
          <StepGoals
            activeInputs={activeInputs}
            activeUpdate={activeUpdate}
            currency={currency}
            currencySymbol={currencySymbol}
            includeSpouse={includeSpouse}
            person={person}
            setPerson={setPerson}
            errors={errors}
            clearErrors={clearErrors}
            preview={preview}
            showPreview={showPreview}
          />
        ) : null}
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Live preview</Text>
          <Text style={styles.previewValue}>{showPreview && preview ? `${formatCurrency(preview.projectedPortfolioAtTarget, true, currency)} projected at age ${inputs.retirementAge || "—"}` : "Enter the required fields to see a preview"}</Text>
        </View>
        <View style={styles.nav}>
          <Pressable disabled={wizardStep === 0} onPress={back} style={[styles.navButton, wizardStep === 0 ? styles.navDisabled : null]}>
            <ChevronLeft size={16} color={colors.foreground} />
            <Text style={styles.navText}>Back</Text>
          </Pressable>
          <AppButton
            label={wizardStep === 4 ? "Calculate FIRE" : "Next"}
            onPress={next}
            icon={wizardStep === 4 ? <Flame size={16} color={colors.primaryForeground} /> : <ChevronRight size={16} color={colors.primaryForeground} />}
          />
        </View>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  backLink: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { color: colors.mutedForeground, fontWeight: "700" },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "900", marginBottom: 14 },
  preview: { backgroundColor: colors.cardElevated, borderRadius: 12, padding: 12, gap: 4 },
  previewLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  previewValue: { color: colors.foreground, fontWeight: "800" },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  navButton: { minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 4 },
  navDisabled: { opacity: 0.35 },
  navText: { color: colors.foreground, fontWeight: "800" }
});
