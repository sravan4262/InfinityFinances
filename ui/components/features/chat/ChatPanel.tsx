"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import {
  chatApi,
  ChatRateLimitedError,
  type ChatArea,
  type ChatMessage,
} from "@/lib/api/chat";
import { cn } from "@/lib/utils";
import { renderChatContent } from "./renderChatContent";
import { useChatArea } from "@/lib/hooks/useChatArea";
import { useFireStore } from "@/lib/store";
import { FIRE_ENGINE_DEFAULTS } from "@/lib/fireDefaults";
import { useMoneyStore } from "@/lib/money/store";
import type { TxKind } from "@/lib/money/types";
import { useRouter } from "next/navigation";

const AREA_LABELS: Record<ChatArea, string> = {
  retirement: "Retirement assistant",
  home: "Home-buying assistant",
  budget: "Budget assistant",
};

const AREA_GREETINGS: Record<ChatArea, string> = {
  retirement:
    "Hey — I can help you figure out when you can retire. Are we planning in USD or INR, and what's your current age?",
  home:
    "Hey — I can help you think through buying a home. Are you looking at affordability, mortgage math, or rent-vs-buy?",
  budget:
    "Hey — I can help you log a transaction or set a monthly budget. What did you spend (or earn) today?",
};

const MAX_INPUT_CHARS = 1_000;
const RETIREMENT_REQUIRED_FIELDS = [
  "currentAge",
  "retirementAge",
  "afterTaxIncome",
  "currentSpending",
  "currentPortfolio",
  "retirementSpending",
  "expectedReturn",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: Props) {
  const { area, context, applyExtracted } = useChatArea();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [throttleUntil, setThrottleUntil] = useState<number | null>(null);
  const [throttleNow, setThrottleNow] = useState<number>(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef<Set<string>>(new Set());

  // Load history when the panel opens for an area.
  useEffect(() => {
    if (!open || !area) return;
    let cancelled = false;
    setLoadingHistory(true);
    appliedRef.current = new Set();
    chatApi
      .history(area)
      .then((h) => {
        if (!cancelled) setMessages(h.messages);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, area]);

  // Autoscroll on message changes.
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Throttle countdown ticker.
  useEffect(() => {
    if (!throttleUntil) return;
    const id = setInterval(() => {
      const now = Date.now();
      setThrottleNow(now);
      if (now >= throttleUntil) setThrottleUntil(null);
    }, 250);
    return () => clearInterval(id);
  }, [throttleUntil]);

  const sendMessage = async () => {
    if (!area) return;
    const text = input.trim();
    if (!text || loading) return;
    setServiceError(null);
    setInputError(null);
    if (text.length > MAX_INPUT_CHARS) {
      setInputError(`Keep it under ${MAX_INPUT_CHARS} characters.`);
      return;
    }
    if (/^https?:\/\/\S+$/i.test(text)) {
      setInputError("Please send a question, not just a link.");
      return;
    }

    setInput("");
    setLoading(true);

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      session_id: "",
      role: "user",
      content: text,
      extracted_inputs: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const { reply, extracted, action } = await chatApi.send(area, text, context);
      const assistant: ChatMessage = {
        id: `local-${Date.now()}-a`,
        session_id: "",
        role: "assistant",
        content: reply,
        extracted_inputs: extracted,
        created_at: new Date().toISOString(),
      };
      // If Gemini classified this turn as "calculate", fire the Calculate
      // flow directly — no chip, no extra click. We mark the message as
      // already-applied so the chip stays hidden on this message.
      if (area === "retirement" && action === "calculate") {
        const next = [...messages, optimistic, assistant];
        const merged = mergeNumericExtracted(next);
        if (Object.keys(merged).length > 0 && hasRequiredRetirementInputs(merged)) {
          applyExtracted(withRetirementDefaults(merged));
          const store = useFireStore.getState();
          store.setActiveTab("calculator");
          store.calculate();
          appliedRef.current.add(assistant.id);
          setMessages(next);
          onClose();
          router.push("/");
          return;
        }
      }
      setMessages((m) => [...m, assistant]);
    } catch (err) {
      // Roll back the optimistic bubble and restore the input.
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
      setInput(text);

      if (err instanceof ChatRateLimitedError) {
        setThrottleUntil(Date.now() + err.retryAfterSeconds * 1_000);
        setThrottleNow(Date.now());
      } else if (err instanceof Error && /503|offline|configured/i.test(err.message)) {
        setServiceError("AI is offline right now.");
      } else {
        setMessages((m) => [
          ...m,
          {
            id: `local-${Date.now()}-err`,
            session_id: "",
            role: "assistant",
            content: "Sorry, I hit an error. Try again?",
            extracted_inputs: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!area) return;
    if (!confirm("Clear this chat history?")) return;
    await chatApi.clear(area).catch(() => {});
    setMessages([]);
    appliedRef.current = new Set();
  };

  if (!area) return null;

  const throttleSecondsLeft =
    throttleUntil && throttleUntil > throttleNow
      ? Math.max(1, Math.ceil((throttleUntil - throttleNow) / 1_000))
      : 0;
  const sendDisabled = !input.trim() || loading || throttleSecondsLeft > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className={cn(
              // Anchored to the bottom-right corner where the FAB lives.
              // Sized like a chat window (~400 × 600), capped to the viewport
              // on smaller screens but never full-bleed.
              "fixed z-50 flex flex-col overflow-hidden",
              "right-4 sm:right-6",
              "bottom-4 sm:bottom-6",
              "w-[min(calc(100vw-2rem),26rem)]",
              "h-[min(calc(100vh-2rem),38rem)]",
              "rounded-2xl border border-border bg-background",
              "shadow-2xl shadow-black/40"
            )}
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-semibold text-sm">{AREA_LABELS[area]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Powered by Gemini</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    title="Clear history"
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {serviceError && (
              <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {serviceError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed max-w-[85%]">
                  {AREA_GREETINGS[area]}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isLatestAssistant =
                    msg.role === "assistant" && idx === messages.length - 1;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "flex flex-col",
                        msg.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {renderChatContent(msg.content)}
                      </div>
                      {isLatestAssistant && msg.extracted_inputs && (
                        <ApplyChips
                          area={area}
                          messageId={msg.id}
                          extracted={msg.extracted_inputs}
                          allMessages={messages}
                          alreadyApplied={appliedRef.current}
                          onApply={(toApply) => {
                            appliedRef.current.add(msg.id);
                            applyExtracted(toApply);
                          }}
                          onClose={onClose}
                        />
                      )}
                    </motion.div>
                  );
                })
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3 space-y-1">
              {throttleSecondsLeft > 0 && (
                <p className="text-[11px] text-amber-500">
                  Slow down — try again in {throttleSecondsLeft}s.
                </p>
              )}
              {inputError && (
                <p className="text-[11px] text-destructive">{inputError}</p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask anything..."
                  rows={1}
                  maxLength={MAX_INPUT_CHARS + 100 /* generous; we cap on send */}
                  className="flex-1 resize-none bg-muted/30 rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 max-h-28"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendDisabled}
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                    !sendDisabled
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {input.length >= 800 && (
                <p
                  className={cn(
                    "text-[10px] text-right",
                    input.length > MAX_INPUT_CHARS ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {input.length}/{MAX_INPUT_CHARS}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Apply chips ────────────────────────────────────────────────────────────

function ApplyChips({
  area,
  messageId,
  extracted,
  allMessages,
  alreadyApplied,
  onApply,
  onClose,
}: {
  area: ChatArea;
  messageId: string;
  extracted: Record<string, unknown>;
  // Full message list so the Calculate action can replay every value the
  // user has supplied across the conversation, not just the latest turn's
  // delta. Later writes win, so updating a number ("change retirement age
  // to 50") naturally overrides the earlier value.
  allMessages: ChatMessage[];
  alreadyApplied: Set<string>;
  onApply: (toApply: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const accounts = useMoneyStore((s) => s.accounts);
  const categories = useMoneyStore((s) => s.categories);
  const addTransaction = useMoneyStore((s) => s.addTransaction);
  const setBudget = useMoneyStore((s) => s.setBudget);
  const router = useRouter();
  const [applied, setApplied] = useState(alreadyApplied.has(messageId));

  if (applied) return null;
  if (!extracted || Object.keys(extracted).length === 0) return null;

  if (area === "retirement") {
    const merged = mergeNumericExtracted(allMessages);
    if (Object.keys(merged).length === 0 || !hasRequiredRetirementInputs(merged)) return null;
    // Single button: replay every numeric value the user has supplied across
    // the chat (later turns override earlier ones), top up the engine-only
    // defaults the form would have stamped on mount (lifeExpectancy etc.),
    // run the FIRE engine, and land the user on the results screen.
    return (
      <div className="mt-1.5 ml-1">
        <button
          onClick={() => {
            onApply(withRetirementDefaults(merged));
            const store = useFireStore.getState();
            store.setActiveTab("calculator");
            store.calculate();
            setApplied(true);
            onClose();
            router.push("/");
          }}
          className="text-[11px] font-semibold rounded-full border border-primary/40 bg-primary/15 text-primary px-3 py-1 hover:bg-primary/25 transition-colors"
        >
          Calculate
        </button>
      </div>
    );
  }

  if (area === "home") {
    const fields = Object.entries(extracted).filter(
      ([, v]) => typeof v === "number" && Number.isFinite(v)
    );
    if (fields.length === 0) return null;
    const summary =
      fields.length === 1
        ? `Set ${humanizeField(fields[0][0])} = ${fields[0][1]}`
        : `Apply ${fields.length} suggested values`;
    return (
      <div className="mt-1.5 ml-1">
        <button
          onClick={() => {
            onApply(extracted);
            setApplied(true);
          }}
          className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-3 py-1 hover:bg-primary/20 transition-colors"
        >
          {summary}
        </button>
      </div>
    );
  }

  // Budget area: transaction → log it; budget → upsert.
  const txn = extracted.transaction as Record<string, unknown> | undefined;
  const bud = extracted.budget as Record<string, unknown> | undefined;
  if (!txn && !bud) return null;

  return (
    <div className="mt-1.5 ml-1 flex flex-wrap gap-1.5">
      {txn && typeof txn.amount === "number" && (
        <button
          onClick={() => {
            const kind: TxKind = txn.kind === "income" ? "income" : "expense";
            const category =
              findCategory(categories, txn.category as string | undefined, kind) ??
              categories.find((c) => c.kind === kind);
            const account =
              findAccount(accounts, txn.account as string | undefined) ?? accounts[0];
            if (!category || !account) return;
            addTransaction({
              date: typeof txn.date === "string" ? txn.date : new Date().toISOString().slice(0, 10),
              kind,
              amount: Number(txn.amount),
              categoryId: category.id,
              accountId: account.id,
              note: typeof txn.note === "string" ? txn.note : undefined,
            });
            setApplied(true);
          }}
          className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-3 py-1 hover:bg-primary/20 transition-colors"
        >
          Log {txn.kind === "income" ? "income" : "expense"} of ${Number(txn.amount).toFixed(2)}
        </button>
      )}
      {bud && typeof bud.amount === "number" && typeof bud.category === "string" && (
        <button
          onClick={() => {
            const category = findCategory(categories, bud.category as string, "expense");
            const month =
              typeof bud.month === "string" && /^\d{4}-\d{2}$/.test(bud.month)
                ? bud.month
                : new Date().toISOString().slice(0, 7);
            if (!category) return;
            setBudget(month, category.id, Number(bud.amount));
            setApplied(true);
          }}
          className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-3 py-1 hover:bg-primary/20 transition-colors"
        >
          Set {bud.category} budget = ${Number(bud.amount).toFixed(0)}
        </button>
      )}
    </div>
  );
}

function findCategory<T extends { id: string; label: string; kind: string }>(
  categories: T[],
  label: string | undefined,
  kind: string
): T | undefined {
  if (!label) return undefined;
  const lower = label.toLowerCase();
  return categories.find((c) => c.kind === kind && c.label.toLowerCase() === lower);
}

function findAccount<T extends { id: string; name: string }>(
  accounts: T[],
  name: string | undefined
): T | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return accounts.find((a) => a.name.toLowerCase() === lower);
}

function humanizeField(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Walk every assistant message in order and merge top-level numeric values
// and currency from `extracted_inputs`. Later messages override earlier ones
// for the same key, which is exactly what we want — "change my retirement age
// to 50" in turn N replaces the 55 captured in turn N-1.
function mergeNumericExtracted(messages: ChatMessage[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const e = m.extracted_inputs;
    if (!e || typeof e !== "object") continue;
    for (const [k, v] of Object.entries(e)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      if (k === "currency" && (v === "USD" || v === "INR")) out[k] = v;
    }
  }
  return out;
}

function hasRetirementCurrency(values: Record<string, unknown>): boolean {
  return values.currency === "USD" || values.currency === "INR";
}

function hasRequiredRetirementInputs(values: Record<string, unknown>): boolean {
  const inputs = useFireStore.getState().inputs as unknown as Record<string, unknown>;
  return (
    hasRetirementCurrency(values) &&
    RETIREMENT_REQUIRED_FIELDS.every((field) => {
      const extracted = values[field];
      if (typeof extracted === "number" && Number.isFinite(extracted)) return true;
      const stored = inputs[field];
      return typeof stored === "number" && Number.isFinite(stored) && stored > 0;
    })
  );
}

// Top up engine-required fields the chat doesn't ask the user about — only
// where the merged record and the live store both lack a value. This is the
// chat-side mirror of the mount-effect inside SimpleCalculator and uses the
// same FIRE_ENGINE_DEFAULTS so both surfaces agree on the numbers.
function withRetirementDefaults(merged: Record<string, unknown>): Record<string, unknown> {
  const store = useFireStore.getState().inputs;
  const out = { ...merged };
  for (const k of Object.keys(FIRE_ENGINE_DEFAULTS) as (keyof typeof FIRE_ENGINE_DEFAULTS)[]) {
    if (out[k] !== undefined) continue;
    if (store[k]) continue; // already explicitly set by the form
    out[k] = FIRE_ENGINE_DEFAULTS[k];
  }
  return out;
}
