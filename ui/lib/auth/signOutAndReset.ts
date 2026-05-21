"use client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createClient } from "@/lib/supabase/client";
import { resetAllUserState } from "./resetAllUserState";

export async function signOutAndReset(router?: AppRouterInstance) {
  const supabase = createClient();
  await supabase.auth.signOut();
  resetAllUserState();
  if (router) {
    router.replace("/");
    router.refresh();
  }
}
