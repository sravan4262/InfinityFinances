"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFireStore, type WizardStep } from "@/lib/store";
import { ValidationContext } from "@/lib/ValidationContext";
import { StepYou } from "./steps/StepYou";
import { StepIncome } from "./steps/StepIncome";
import { StepPortfolio } from "./steps/StepPortfolio";
import { StepAdvanced } from "./steps/StepAdvanced";
import { StepScenarios } from "./steps/StepScenarios";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Flame } from "lucide-react";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { CurrencySelector } from "./CurrencySelector";

const STEPS: { label: string; shortLabel: string }[] = [
  { label: "You", shortLabel: "You" },
  { label: "Income", shortLabel: "Income" },
  { label: "Portfolio", shortLabel: "Portfolio" },
  { label: "Advanced", shortLabel: "Advanced" },
  { label: "Scenarios", shortLabel: "Goals" },
];

const StepComponents = [StepYou, StepIncome, StepPortfolio, StepAdvanced, StepScenarios];

type Errors = Record<string, string>;

export function FormWizard() {
  const { wizardStep, setWizardStep, calculate, inputs, spouseInputs, includeSpouse } = useFireStore();
  const [errors, setErrors] = useState<Errors>({});

  // Clear errors as user edits fields so stale red highlights don't persist
  useEffect(() => { setErrors({}); }, [inputs, spouseInputs]);

  const StepContent = StepComponents[wizardStep];
  const isLast = wizardStep === STEPS.length - 1;

  const validate = (step: WizardStep): Errors => {
    const e: Errors = {};
    if (step === 0) {
      if (!inputs.currentAge) e.currentAge = "Enter your current age";
      if (!inputs.retirementAge) e.retirementAge = "Enter your target retirement age";
      else if (inputs.retirementAge <= inputs.currentAge) e.retirementAge = "Must be after your current age";
      if (!inputs.lifeExpectancy) e.lifeExpectancy = "Enter your life expectancy";
      else if (inputs.lifeExpectancy <= inputs.retirementAge) e.lifeExpectancy = "Must be after retirement age";
      if (includeSpouse) {
        if (!spouseInputs.currentAge) e.spouseCurrentAge = "Enter spouse's current age";
        if (!spouseInputs.retirementAge) e.spouseRetirementAge = "Enter spouse's target retirement age";
        else if (spouseInputs.retirementAge <= spouseInputs.currentAge) e.spouseRetirementAge = "Must be after spouse's current age";
        if (!spouseInputs.lifeExpectancy) e.spouseLifeExpectancy = "Enter spouse's life expectancy";
        else if (spouseInputs.lifeExpectancy <= spouseInputs.retirementAge) e.spouseLifeExpectancy = "Must be after spouse's retirement age";
      }
    }
    if (step === 1) {
      if (!inputs.afterTaxIncome) e.afterTaxIncome = "Enter your after-tax income";
      if (!inputs.currentSpending) e.currentSpending = "Enter your annual spending";
    }
    if (step === 4) {
      if (!inputs.retirementSpending && !inputs.monthlyRetirementSalary)
        e.retirementSpending = "Enter your target retirement spending";
    }
    return e;
  };

  const goNext = () => {
    const stepErrors = validate(wizardStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    if (isLast) {
      calculate();
    } else {
      setWizardStep((wizardStep + 1) as WizardStep);
    }
  };

  const goPrev = () => {
    setErrors({});
    if (wizardStep > 0) setWizardStep((wizardStep - 1) as WizardStep);
  };

  const goToStep = (i: number) => {
    setErrors({});
    setWizardStep(i as WizardStep);
  };

  return (
    <div className="w-full max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
      {/* Left: form */}
      <div>
        <div className="mb-4">
          <CurrencySelector />
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className="flex items-center gap-1.5 group"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-200",
                  i === wizardStep
                    ? "bg-primary text-primary-foreground scale-110"
                    : i < wizardStep
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < wizardStep ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs hidden sm:block transition-colors",
                  i === wizardStep ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6 sm:w-8 transition-colors",
                    i < wizardStep ? "bg-primary/50" : "bg-border"
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {/* Step content */}
        <ValidationContext.Provider value={errors}>
          <div className="glass rounded-2xl p-6 sm:p-8 min-h-[420px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <StepContent />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
              <button
                onClick={goPrev}
                disabled={wizardStep === 0}
                className={cn(
                  "flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-colors",
                  wizardStep === 0
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <span className="text-xs text-muted-foreground">
                {wizardStep + 1} of {STEPS.length}
              </span>

              <button
                onClick={goNext}
                className={cn(
                  "flex items-center gap-1.5 text-sm px-5 py-2 rounded-lg font-medium transition-all",
                  isLast
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {isLast ? (
                  <>
                    <Flame className="w-4 h-4" />
                    Calculate FIRE
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </ValidationContext.Provider>
      </div>

      {/* Right: live preview panel (desktop only) */}
      <LivePreviewPanel step={wizardStep} />
    </div>
  );
}
