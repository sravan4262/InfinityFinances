import { useFireStore } from "@/lib/store";
import { useMoneyStore } from "@/lib/money/store";
import { useTrackerStore } from "@/lib/tracker/store";
import { useChatContextStore } from "@/lib/chatContextStore";
import { useHomeCalcStore } from "@/features/home-calc/store";

export function resetAllUserState() {
  useFireStore.getState().reset();
  useMoneyStore.getState().disconnectSync();
  useTrackerStore.getState().reset();
  useHomeCalcStore.getState().reset();
  useChatContextStore.getState().clearAll();
}
