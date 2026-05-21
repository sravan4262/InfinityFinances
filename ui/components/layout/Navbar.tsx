"use client";
import { Flame, Calculator, BarChart2, Home, Receipt } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "./AuthButton";
import { useFireStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { hasResults, resetInputs, startNewPlan, activeTab, setActiveTab, wizardStep } = useFireStore();
  const isEarlyRetirement = activeTab === "calculator" || activeTab === "tracker";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Main nav row */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-14">
        {/* Logo */}
        <button onClick={resetInputs} className="flex items-center gap-2 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Flame className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-semibold tracking-tight text-base">
            Infinity<span className="text-primary">Finances</span>
          </span>
        </button>

        {/* Main tabs */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/40 justify-self-center">
          {/* Early Retirement */}
          <button
            onClick={() => setActiveTab("calculator")}
            className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isEarlyRetirement && (
              <motion.div
                layoutId="main-tab-pill"
                className="absolute inset-0 rounded-lg bg-primary/25 border border-primary/35"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-2 text-foreground transition-opacity ${isEarlyRetirement ? "opacity-100" : "opacity-40"}`}>
              <Calculator className="w-4 h-4" />
              <span className="hidden lg:inline">Early Retirement Calc</span>
              <span className="lg:hidden">Retire Calc</span>
            </span>
          </button>

          {/* Home Mortgage */}
          <button
            onClick={() => setActiveTab("home")}
            className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {activeTab === "home" && (
              <motion.div
                layoutId="main-tab-pill"
                className="absolute inset-0 rounded-lg bg-primary/25 border border-primary/35"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-2 text-foreground transition-opacity ${activeTab === "home" ? "opacity-100" : "opacity-40"}`}>
              <Home className="w-4 h-4" />
              <span className="hidden lg:inline">Home Mortgage Calc</span>
              <span className="lg:hidden">Home Calc</span>
            </span>
          </button>

          {/* Expense */}
          <button
            onClick={() => setActiveTab("expense")}
            className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {activeTab === "expense" && (
              <motion.div
                layoutId="main-tab-pill"
                className="absolute inset-0 rounded-lg bg-primary/25 border border-primary/35"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-2 text-foreground transition-opacity ${activeTab === "expense" ? "opacity-100" : "opacity-40"}`}>
              <Receipt className="w-4 h-4" />
              Budget Calc
            </span>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 justify-self-end">
          {activeTab === "calculator" && (wizardStep > 0 || hasResults) && (
            <motion.button
              key="start-over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={startNewPlan}
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-full border border-border hover:border-border/80 transition-colors"
            >
              Start over
            </motion.button>
          )}
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>

      {/* Sub-tabs row — slides in when Early Retirement is active */}
      <AnimatePresence>
        {isEarlyRetirement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-center py-1.5">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/30">
                {([
                  { tab: "calculator" as const, label: "Calculator", icon: <Calculator className="w-3.5 h-3.5" /> },
                  { tab: "tracker" as const, label: "Track", icon: <BarChart2 className="w-3.5 h-3.5" /> },
                ]).map(({ tab, label, icon }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="sub-tab-pill"
                        className="absolute inset-0 rounded-md bg-primary/25 border border-primary/35"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${activeTab === tab ? "text-foreground" : "text-muted-foreground"}`}>
                      {icon}
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
