"use client";
import { motion } from "framer-motion";
import { LayoutDashboard, Zap } from "lucide-react";
import { useFireStore, type InputMode } from "@/lib/store";
import { cn } from "@/lib/utils";

const modes: { id: InputMode; label: string; icon: React.ReactNode }[] = [
  { id: "simple", label: "Simple", icon: <Zap className="w-4 h-4" /> },
  { id: "form", label: "Advanced", icon: <LayoutDashboard className="w-4 h-4" /> },
];

export function ModeToggle() {
  const { inputMode, setInputMode } = useFireStore();

  return (
    <div className="relative flex items-center gap-0.5 rounded-full bg-muted p-1 border border-border">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setInputMode(mode.id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10",
            inputMode === mode.id
              ? "text-primary-foreground"
              : "text-foreground/70 hover:text-foreground"
          )}
        >
          {inputMode === mode.id && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{mode.icon}</span>
          <span className="relative z-10">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
