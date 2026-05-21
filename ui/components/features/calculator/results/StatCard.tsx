"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
  gold?: boolean;
  delay?: number;
  icon?: React.ReactNode;
}

function useCountUp(target: string, duration = 800) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const numeric = parseFloat(target.replace(/[^0-9.-]/g, ""));
    if (isNaN(numeric)) {
      setDisplay(target);
      return;
    }

    const start = Date.now();
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = numeric * eased;

      // Reconstruct with the original formatting
      const formatted = target.replace(/[\d,]+(\.\d+)?/, () => {
        if (target.includes("$")) {
          return Math.round(current).toLocaleString();
        }
        return current.toFixed(target.includes(".") ? 1 : 0);
      });
      setDisplay(formatted);

      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export function StatCard({
  label,
  value,
  subValue,
  highlight,
  gold,
  delay = 0,
  icon,
}: StatCardProps) {
  const animated = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-1",
        highlight && "border-primary/40 bg-primary/5 glow-primary",
        gold && "border-gold/40 bg-gold/5 glow-gold",
        !highlight && !gold && "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn("text-xs", highlight ? "text-primary" : gold ? "text-gold" : "text-muted-foreground")}>
            {icon}
          </span>
        )}
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <p
        className={cn(
          "text-2xl sm:text-3xl font-bold tabular-nums",
          highlight && "text-primary",
          gold && "text-gold",
          !highlight && !gold && "text-foreground"
        )}
      >
        {animated}
      </p>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </motion.div>
  );
}
