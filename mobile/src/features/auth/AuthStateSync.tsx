import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { resetAllUserState } from "@/lib/auth/resetAllUserState";

export function AuthStateSync() {
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetAllUserState();
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
