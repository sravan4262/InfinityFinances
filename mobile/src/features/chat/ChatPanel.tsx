import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Send, Trash2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  chatApi,
  ChatRateLimitedError,
  type ChatArea,
  type ChatMessage,
} from "@/lib/api/chat";
import { useChatArea } from "@/lib/hooks/useChatArea";
import { useFireStore } from "@/lib/store";
import { FIRE_ENGINE_DEFAULTS } from "@/lib/fireDefaults";
import { useMoneyStore } from "@/lib/money/store";
import type { TxKind } from "@/lib/money/types";
import { renderChatContent } from "./renderChatContent";
import { warning } from "@/lib/haptics";
import { useRouter } from "expo-router";

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { area, context, applyExtracted } = useChatArea();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [throttleUntil, setThrottleUntil] = useState<number | null>(null);
  const [throttleNow, setThrottleNow] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const appliedRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<ChatMessage>>(null);

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

  useEffect(() => {
    if (!throttleUntil) return;
    const id = setInterval(() => {
      const now = Date.now();
      setThrottleNow(now);
      if (now >= throttleUntil) setThrottleUntil(null);
    }, 250);
    return () => clearInterval(id);
  }, [throttleUntil]);

  const send = async () => {
    if (!area) return;
    const text = input.trim();
    if (!text || sending) return;
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
    setSending(true);

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
      // flow directly — no chip, no extra tap. Mark the message as
      // already-applied so the chip stays hidden on this message.
      if (area === "retirement" && action === "calculate") {
        const next = [...messages, optimistic, assistant];
        const merged = mergeNumericExtracted(next);
        if (Object.keys(merged).length > 0 && hasRequiredRetirementInputs(merged)) {
          applyExtracted(withRetirementDefaults(merged));
          useFireStore.getState().calculate();
          appliedRef.current.add(assistant.id);
          setMessages(next);
          onClose();
          router.push("/retire/results");
          return;
        }
      }
      setMessages((m) => [...m, assistant]);
    } catch (err) {
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
      setSending(false);
    }
  };

  const handleClear = () => {
    if (!area) return;
    Alert.alert("Clear chat?", "This removes this area's chat history.", [
      { text: "Cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          warning();
          chatApi.clear(area).then(() => setMessages([])).catch(() => {});
          appliedRef.current = new Set();
        },
      },
    ]);
  };

  if (!area) return null;

  const throttleSecondsLeft =
    throttleUntil && throttleUntil > throttleNow
      ? Math.max(1, Math.ceil((throttleUntil - throttleNow) / 1_000))
      : 0;
  const sendDisabled = !input.trim() || sending || throttleSecondsLeft > 0;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      {/* Backdrop — tap to dismiss. Transparent modal so the underlying
          screen stays visible behind the chat window. */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          // Swallow taps inside the window so they don't dismiss.
          onPress={() => {}}
          style={{
            height: "82%",
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 },
            overflow: "hidden",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            {/* Drag handle for affordance — purely cosmetic. */}
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginTop: 8,
                marginBottom: 4,
              }}
            />
            <View
              style={{
                paddingTop: 8,
                paddingHorizontal: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
          <View>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 16 }}>
              {AREA_LABELS[area]}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
              Powered by Gemini
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {messages.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8} style={{ padding: 8 }}>
                <Trash2 color={colors.destructive} size={18} />
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8} style={{ padding: 8 }}>
              <X color={colors.mutedForeground} size={20} />
            </Pressable>
          </View>
        </View>

        {serviceError && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.destructive,
              backgroundColor: colors.background,
            }}
          >
            <Text style={{ color: colors.destructive, fontSize: 12 }}>{serviceError}</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            loadingHistory ? (
              <ActivityIndicator color={colors.mutedForeground} />
            ) : (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: colors.cardElevated,
                  padding: 12,
                  borderRadius: 14,
                  maxWidth: "85%",
                }}
              >
                <Text style={{ color: colors.foreground }}>{AREA_GREETINGS[area]}</Text>
              </View>
            )
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => {
            const isUser = item.role === "user";
            const isLatestAssistant = !isUser && index === messages.length - 1;
            return (
              <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    backgroundColor: isUser ? colors.primary : colors.cardElevated,
                    padding: 12,
                    borderRadius: 14,
                    maxWidth: "85%",
                  }}
                >
                  <Text style={{ color: isUser ? colors.primaryForeground : colors.foreground }}>
                    {renderChatContent(item.content, isUser ? colors.primaryForeground : colors.foreground)}
                  </Text>
                </View>
                {isLatestAssistant && item.extracted_inputs && (
                  <ApplyChips
                    area={area}
                    messageId={item.id}
                    extracted={item.extracted_inputs}
                    allMessages={messages}
                    alreadyApplied={appliedRef.current}
                    onApply={(toApply) => {
                      appliedRef.current.add(item.id);
                      applyExtracted(toApply);
                    }}
                    onClose={onClose}
                  />
                )}
              </View>
            );
          }}
        />

        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 6,
          }}
        >
          {throttleSecondsLeft > 0 && (
            <Text style={{ color: "#d97706", fontSize: 11 }}>
              Slow down — try again in {throttleSecondsLeft}s.
            </Text>
          )}
          {inputError && <Text style={{ color: colors.destructive, fontSize: 11 }}>{inputError}</Text>}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <TextInput
              value={input}
              onChangeText={(t) => {
                setInput(t);
                if (inputError) setInputError(null);
              }}
              placeholder="Ask anything..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={MAX_INPUT_CHARS + 100}
              style={{
                flex: 1,
                color: colors.foreground,
                backgroundColor: colors.cardElevated,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                maxHeight: 120,
              }}
            />
            <Pressable
              onPress={send}
              disabled={sendDisabled}
              style={{
                backgroundColor: sendDisabled ? colors.cardElevated : colors.primary,
                width: 44,
                height: 44,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {sending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Send size={18} color={sendDisabled ? colors.mutedForeground : colors.primaryForeground} />
              )}
            </Pressable>
          </View>
        </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
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
  // Full message list so Calculate can replay every value the user has
  // supplied across the conversation, not just the latest turn's delta.
  // Later writes win, so updating a number naturally overrides the earlier
  // value.
  allMessages: ChatMessage[];
  alreadyApplied: Set<string>;
  onApply: (toApply: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const accounts = useMoneyStore((s) => s.accounts);
  const categories = useMoneyStore((s) => s.categories);
  const addTransaction = useMoneyStore((s) => s.addTransaction);
  const setBudget = useMoneyStore((s) => s.setBudget);
  const [applied, setApplied] = useState(alreadyApplied.has(messageId));

  if (applied) return null;
  if (!extracted || Object.keys(extracted).length === 0) return null;

  if (area === "retirement") {
    const merged = mergeNumericExtracted(allMessages);
    if (Object.keys(merged).length === 0 || !hasRequiredRetirementInputs(merged)) return null;
    // Single button: replay every numeric value the user has supplied across
    // the chat (later turns override earlier ones), top up the engine-only
    // defaults the form would have stamped, run the FIRE engine, and route
    // to the results screen.
    return (
      <Pressable
        onPress={() => {
          onApply(withRetirementDefaults(merged));
          useFireStore.getState().calculate();
          setApplied(true);
          onClose();
          router.push("/retire/results");
        }}
        style={{
          marginTop: 6,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.cardElevated,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>Calculate</Text>
      </Pressable>
    );
  }

  if (area === "home") {
    const fields = Object.entries(extracted).filter(
      ([, v]) => typeof v === "number" && Number.isFinite(v)
    );
    if (fields.length === 0) return null;
    const label =
      fields.length === 1
        ? `Set ${humanizeField(fields[0][0])} = ${fields[0][1]}`
        : `Apply ${fields.length} suggested values`;
    return (
      <Pressable
        onPress={() => {
          onApply(extracted);
          setApplied(true);
        }}
        style={{
          marginTop: 6,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.cardElevated,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>{label}</Text>
      </Pressable>
    );
  }

  const txn = extracted.transaction as Record<string, unknown> | undefined;
  const bud = extracted.budget as Record<string, unknown> | undefined;
  if (!txn && !bud) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 }}>
      {txn && typeof txn.amount === "number" && (
        <Pressable
          onPress={() => {
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
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.cardElevated,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>
            Log {txn.kind === "income" ? "income" : "expense"} ${Number(txn.amount).toFixed(2)}
          </Text>
        </Pressable>
      )}
      {bud && typeof bud.amount === "number" && typeof bud.category === "string" && (
        <Pressable
          onPress={() => {
            const category = findCategory(categories, bud.category as string, "expense");
            const month =
              typeof bud.month === "string" && /^\d{4}-\d{2}$/.test(bud.month)
                ? (bud.month as string)
                : new Date().toISOString().slice(0, 7);
            if (!category) return;
            setBudget(month, category.id, Number(bud.amount));
            setApplied(true);
          }}
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.cardElevated,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>
            Set {bud.category} budget = ${Number(bud.amount).toFixed(0)}
          </Text>
        </Pressable>
      )}
    </View>
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
// for the same key — "change my retirement age to 50" replaces the 55 captured
// earlier.
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
// where the merged record and the live store both lack a value. Mirrors the
// web helper in ui/components/features/chat/ChatPanel.tsx and shares the
// same FIRE_ENGINE_DEFAULTS so both surfaces produce identical numbers.
function withRetirementDefaults(merged: Record<string, unknown>): Record<string, unknown> {
  const store = useFireStore.getState().inputs;
  const out = { ...merged };
  for (const k of Object.keys(FIRE_ENGINE_DEFAULTS) as (keyof typeof FIRE_ENGINE_DEFAULTS)[]) {
    if (out[k] !== undefined) continue;
    if (store[k]) continue;
    out[k] = FIRE_ENGINE_DEFAULTS[k];
  }
  return out;
}
