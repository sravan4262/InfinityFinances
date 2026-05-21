// Apple sign-in temporarily disabled — see docs/auth-otp-only.md.
// Code preserved as reference for re-enabling later.
export {};

/*
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  disabled?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  next?: string;
}

// Apple JS SDK — only the bits we use. Loaded by the <Script> in app/layout.tsx.
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
          state?: string;
          nonce?: string;
        }) => void;
        signIn: (options?: {
          state?: string;
          nonce?: string;
        }) => Promise<{
          authorization: { id_token: string; code: string; state?: string };
          user?: { name?: { firstName?: string; lastName?: string }; email?: string };
        }>;
      };
    };
  }
}

let appleInitialized = false;

function generateNonce(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Apple stamps the HASHED nonce into id_token.nonce; Supabase re-hashes the
// raw value we hand it and compares. We pass hashed → Apple, raw → Supabase.
async function sha256Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hash = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AppleSignInButton({ disabled, onLoadingChange, next }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const setBusy = useCallback(
    (b: boolean) => {
      setLoading(b);
      onLoadingChange?.(b);
    },
    [onLoadingChange]
  );

  const handleClick = useCallback(async () => {
    if (disabled || loading) return;

    const serviceId = process.env.NEXT_PUBLIC_APPLE_SERVICE_ID;
    if (!serviceId) {
      alert("Apple sign-in is not configured.");
      return;
    }
    if (!window.AppleID?.auth) {
      alert("Apple sign-in is still loading — try again in a moment.");
      return;
    }

    setBusy(true);

    try {
      const rawNonce = generateNonce();
      const hashedNonce = await sha256Hex(rawNonce);

      // init is idempotent; only do it once per page load.
      if (!appleInitialized) {
        window.AppleID.auth.init({
          clientId: serviceId,
          scope: "name email",
          // Required to register on the Service ID even with popup mode — Apple
          // validates it on its end; popup mode never actually navigates here.
          redirectURI: `${window.location.origin}/auth/callback`,
          usePopup: true,
        });
        appleInitialized = true;
      }

      const result = await window.AppleID.auth.signIn({ nonce: hashedNonce });
      const idToken = result.authorization?.id_token;
      if (!idToken) throw new Error("Apple did not return an id_token");

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: idToken,
        nonce: rawNonce,
      });
      if (error) throw error;

      router.replace(next ?? "/");
    } catch (err) {
      const e = err as { error?: string; message?: string } | null;
      if (e?.error === "popup_closed_by_user") {
        // silent — user cancelled
      } else {
        alert(`Sign-in failed: ${e?.message ?? "try again"}`);
      }
      setBusy(false);
    }
  }, [disabled, loading, setBusy, next, router, supabase]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.365 1.43c0 1.14-.42 2.21-1.14 3.02-.77.87-2.04 1.55-3.13 1.46-.13-1.12.41-2.27 1.12-3.05.79-.87 2.18-1.51 3.15-1.43zM20.5 17.18c-.55 1.21-.81 1.75-1.51 2.82-1 1.51-2.4 3.39-4.15 3.4-1.55.02-1.95-1.02-4.06-1.01-2.11.01-2.54 1.03-4.09 1.01-1.74-.01-3.07-1.7-4.07-3.21-2.79-4.21-3.09-9.16-1.36-11.78 1.23-1.86 3.17-2.95 4.99-2.95 1.85 0 3.02 1.02 4.55 1.02 1.48 0 2.39-1.02 4.54-1.02 1.62 0 3.33.89 4.55 2.41-4 2.18-3.35 7.84.61 9.31z" />
      </svg>
      {loading ? "Signing in…" : "Continue with Apple"}
    </button>
  );
}
*/
