"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useFeatureFlag } from "@/lib/hooks/useFeatureFlag";
import { useChatArea } from "@/lib/hooks/useChatArea";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";

// The single chat surface mounted at the root layout. Decides visibility
// (signed-in + flag on + valid area) and enabled/disabled styling
// (per-area state). Opens the slide-over ChatPanel.
export function ChatLauncher() {
  const { user, loading: userLoading } = useUser();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("chat");
  const { area, enabled, disabledReason } = useChatArea();
  const [open, setOpen] = useState(false);

  // Fail-closed: hide while we're still resolving auth or the flag.
  if (userLoading || flagLoading) return null;
  if (!user) return null;
  if (!flagEnabled) return null;
  if (!area) return null;

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <AnimatePresence>
          {!open && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={() => setOpen(true)}
              title={enabled ? "Ask AI" : (disabledReason ?? "Ask AI")}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-3 shadow-lg shadow-black/30 backdrop-blur transition-colors",
                enabled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Ask AI</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
