import type { Router } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { resetAllUserState } from "./resetAllUserState";

export async function signOutAndReset(router?: Router) {
  if (supabase) await supabase.auth.signOut();
  resetAllUserState();
  if (router) router.replace("/");
}
