import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { makeRedirectUri } from "expo-auth-session";
// Google sign-in temporarily disabled — see docs/auth-otp-only.md.
// import * as QueryParams from "expo-auth-session/build/QueryParams";
// import * as WebBrowser from "expo-web-browser";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { useTheme } from "@/theme/ThemeProvider";
import { LauncherLink } from "@/components/layout/LauncherLink";
import { validateEmail } from "@/lib/validation/email";
import { signOutAndReset } from "@/lib/auth/signOutAndReset";

// WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
  scheme: "infinityfinances",
  path: "auth/callback",
});

/*
// Google sign-in temporarily disabled — see docs/auth-otp-only.md.
async function createSessionFromUrl(url: string) {
  if (!supabase) return;
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const accessToken = typeof params.access_token === "string" ? params.access_token : undefined;
  const refreshToken = typeof params.refresh_token === "string" ? params.refresh_token : undefined;
  if (!accessToken || !refreshToken) return;
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
}
*/

type Step = "email" | "code";

export function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = makeStyles(colors);

  const validation = useMemo(() => validateEmail(email), [email]);
  const showValidationError = touched && !validation.ok && email.length > 0;
  const codeValid = /^\d{6}$/.test(code);
  const verifiedEmail = validation.ok ? validation.value : email;

  /*
  // Google sign-in temporarily disabled — see docs/auth-otp-only.md.
  const signInWithGoogle = async () => {
    if (!supabase || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Google sign-in URL was not returned.");
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success") await createSessionFromUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };
  */

  const sendCode = async () => {
    if (!supabase || loading) return;
    setTouched(true);
    if (!validation.ok) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: validation.value,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!supabase || loading || !codeValid) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: verifiedEmail,
        token: code,
        type: "email",
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const useDifferentEmail = () => {
    setStep("email");
    setCode("");
    setError(null);
  };

  const cancel = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <Screen>
      <LauncherLink />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {user ? user.email : "Sign in to sync saved plans, tracker entries, and chats."}
        </Text>

        {user ? (
          <Pressable
            onPress={() => signOutAndReset(router)}
            style={[styles.signOut, { backgroundColor: colors.cardElevated }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "900", textAlign: "center" }}>Sign out</Text>
          </Pressable>
        ) : step === "code" ? (
          <View style={styles.form}>
            <View style={[styles.codeCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
              <Text style={[styles.codeTitle, { color: colors.foreground }]}>Enter your code</Text>
              <Text style={[styles.codeBody, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to{" "}
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>{verifiedEmail}</Text>.
              </Text>
            </View>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              editable={!loading}
              style={[
                styles.codeInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}
            />
            <AppButton
              label="Verify code"
              onPress={verifyCode}
              loading={loading}
              disabled={!codeValid}
            />
            {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
            <Pressable onPress={useDifferentEmail} disabled={loading} style={styles.linkBtn}>
              <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>Use a different email</Text>
            </Pressable>
            <AppButton label="Cancel" variant="secondary" onPress={cancel} disabled={loading} />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              error={showValidationError && !validation.ok ? validation.error : undefined}
              hint={showValidationError && !validation.ok ? undefined : "We'll email you a 6-digit code."}
              disabled={loading}
            />
            <AppButton
              label="Send code"
              onPress={sendCode}
              loading={loading}
              disabled={!validation.ok}
            />
            <AppButton label="Cancel" variant="secondary" onPress={cancel} disabled={loading} />
            {/*
              // Google sign-in temporarily disabled — see docs/auth-otp-only.md.
              <Pressable
                onPress={signInWithGoogle}
                disabled={loading}
                style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 14, opacity: loading ? 0.7 : 1 }}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: "900", textAlign: "center" }}>
                  {loading ? "Redirecting…" : "Continue with Google"}
                </Text>
              </Pressable>
            */}
            {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    body: { flex: 1, justifyContent: "center", gap: 18 },
    title: { fontSize: 30, fontWeight: "900" },
    subtitle: { fontSize: 14, lineHeight: 20 },
    form: { gap: 14 },
    signOut: { padding: 14, borderRadius: 14 },
    codeCard: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 8 },
    codeTitle: { fontSize: 18, fontWeight: "900" },
    codeBody: { fontSize: 14, lineHeight: 20 },
    codeInput: {
      minHeight: 56,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      fontSize: 22,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: 8,
    },
    linkBtn: { paddingVertical: 6 },
  });
