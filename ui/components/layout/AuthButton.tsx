"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { signOutAndReset } from "@/lib/auth/signOutAndReset";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = () => signOutAndReset(router);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-foreground/70 px-3 py-2 rounded-lg border border-border bg-muted/10">
          <UserIcon className="w-4 h-4" />
          <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 rounded-lg border border-border text-foreground/70 hover:text-foreground hover:border-border/80 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/auth/login")}
      className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground border border-border hover:border-primary/60 rounded-lg px-4 py-2 transition-colors"
    >
      <LogIn className="w-4 h-4" />
      Sign in
    </button>
  );
}
