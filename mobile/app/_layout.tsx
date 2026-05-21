import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { ApiErrorModal } from "@/components/shared/ApiErrorModal";
import { ChatLauncher } from "@/features/chat/ChatLauncher";
import { AuthStateSync } from "@/features/auth/AuthStateSync";

function RootNavigator() {
  const { colors, resolvedTheme } = useTheme();
  return (
    <>
      <AuthStateSync />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" options={{ headerShown: true, title: "Account" }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: true, title: "Signing in" }} />
      </Stack>
      <ChatLauncher />
      <ApiErrorModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
