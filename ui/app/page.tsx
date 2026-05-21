"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFireStore } from "@/lib/store";
import { Navbar } from "@/components/layout/Navbar";
import { FormWizard } from "@/components/features/calculator/FormWizard";
import { SimpleCalculator } from "@/components/features/calculator/SimpleCalculator";
import { ResultsDashboard } from "@/components/features/calculator/results/ResultsDashboard";
import { TrackerPage } from "@/components/features/tracker/TrackerPage";
import { HomeCalcPage } from "@/components/features/home-calc/HomeCalcPage";
import { MoneyPage } from "@/components/features/money/MoneyPage";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { PlansLanding } from "@/components/features/plans/PlansLanding";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import { useUser } from "@/lib/hooks/useUser";
import { Flame } from "lucide-react";

export default function HomePage() {
  const { inputMode, hasResults, activeTab, calculatorView, startNewPlan, setCalculatorView } = useFireStore();
  const { user } = useUser();
  const [savedPlans, setSavedPlans] = useState<SavedPlan[] | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      setSavedPlans([]);
      return;
    }
    plansApi.list().then(setSavedPlans).catch(() => setSavedPlans([]));
  }, [user, calculatorView, hasResults]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          {activeTab === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <HomeCalcPage />
            </motion.div>
          ) : activeTab === "expense" ? (
            <motion.div
              key="expense"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <MoneyPage />
            </motion.div>
          ) : activeTab === "tracker" ? (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TrackerPage />
            </motion.div>
          ) : !hasResults && calculatorView === "overview" && savedPlans && savedPlans.length > 0 ? (
            <motion.div
              key="plans-landing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PlansLanding
                plans={savedPlans}
                onPlansChange={setSavedPlans}
                onEdit={() => setCalculatorView("editor")}
                onStartNew={startNewPlan}
              />
            </motion.div>
          ) : !hasResults ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Hero headline */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-4"
                >
                  <Flame className="w-3 h-3" />
                  Financial Independence · Retire Early
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                >
                  When can you stop working?
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="text-muted-foreground mt-3 max-w-md mx-auto text-sm sm:text-base"
                >
                  {inputMode === "simple"
                    ? "Six numbers, one answer. We'll handle the rest."
                    : "Fill in your numbers and we'll calculate your FIRE date."}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="mt-6 flex justify-center"
                >
                  <ModeToggle />
                </motion.div>
              </div>

              {/* Input mode */}
              <AnimatePresence mode="wait">
                {inputMode === "simple" ? (
                  <motion.div
                    key="simple"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <SimpleCalculator />
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <FormWizard />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ResultsDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        {/* Center glows */}
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-primary/8 dark:bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-gold/6 dark:bg-gold/4 blur-[100px]" />
        {/* Side glows to fill dead space */}
        <div className="absolute top-[10%] left-[-8%] w-[380px] h-[500px] rounded-full bg-primary/6 dark:bg-primary/4 blur-[100px]" />
        <div className="absolute bottom-[15%] right-[-8%] w-[350px] h-[450px] rounded-full bg-primary/5 dark:bg-primary/3 blur-[100px]" />
        <div className="absolute top-[55%] left-[-5%] w-[250px] h-[300px] rounded-full bg-gold/4 dark:bg-gold/2 blur-[80px]" />
      </div>
    </div>
  );
}
