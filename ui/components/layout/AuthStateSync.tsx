"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { resetAllUserState } from "@/lib/auth/resetAllUserState";

export function AuthStateSync() {
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetAllUserState();
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
