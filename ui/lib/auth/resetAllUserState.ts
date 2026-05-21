"use client";
import { useFireStore } from "@/lib/store";
import { useMoneyStore } from "@/lib/money/store";
import { useTrackerStore } from "@/lib/tracker/store";
import { useChatContextStore } from "@/lib/chatContextStore";

export function resetAllUserState() {
  useFireStore.getState().reset();
  useMoneyStore.getState().disconnectSync();
  useTrackerStore.getState().reset();
  useChatContextStore.getState().clearAll();
}
