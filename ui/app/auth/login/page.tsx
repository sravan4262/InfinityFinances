"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flame, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { validateEmail } from "@/lib/validation/email";
// Google / Apple sign-in temporarily disabled — see docs/auth-otp-only.md.
// import { GoogleSignInButton } from "@/components/features/auth/GoogleSignInButton";
// import { AppleSignInButton } from "@/components/features/auth/AppleSignInButton";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const validation = useMemo(() => validateEmail(email), [email]);
  const showValidationError = touched && !validation.ok && email.length > 0;
  const codeValid = /^\d{6}$/.test(code);
  const verifiedEmail = validation.ok ? validation.value : email;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.ok) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: validation.value,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("code");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValid) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: verifiedEmail,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.replace("/");
    router.refresh();
  };

  const handleUseDifferentEmail = () => {
    setStep("email");
    setCode("");
    setError(null);
  };

  const handleCancel = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold">Infinity Finances</span>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to save and sync your plans</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div className="text-center space-y-2 pb-1">
                <Mail className="w-9 h-9 text-primary mx-auto" />
                <p className="font-semibold">Enter your code</p>
                <p className="text-xs text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground">{verifiedEmail}</span>
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                className="w-full rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-center text-lg tracking-[0.4em] font-semibold placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={loading || !codeValid}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify code
              </button>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <button
                type="button"
                onClick={handleUseDifferentEmail}
                disabled={loading}
                className="w-full text-xs text-primary hover:underline disabled:opacity-50"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="w-full rounded-xl border border-border bg-muted/20 hover:bg-muted/40 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              {/*
                Google / Apple sign-in temporarily disabled — see docs/auth-otp-only.md.
                <GoogleSignInButton disabled={loading} onLoadingChange={() => {}} />
                <AppleSignInButton disabled={loading} onLoadingChange={() => {}} />

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              */}

              {/* Email → OTP */}
              <form onSubmit={handleSendCode} className="space-y-2" noValidate>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="you@example.com"
                  required
                  aria-invalid={showValidationError}
                  aria-describedby={showValidationError ? "email-error" : undefined}
                  className="w-full rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {showValidationError && !validation.ok && (
                  <p id="email-error" className="text-xs text-destructive">
                    {validation.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !validation.ok}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Send code
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-muted/20 hover:bg-muted/40 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </form>

              {error && <p className="text-xs text-destructive text-center">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
