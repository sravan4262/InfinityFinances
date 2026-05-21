import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors } from "./colors";

type ThemePreference = "system" | "light" | "dark";
interface ThemeValue {
  colors: AppColors;
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  cycleTheme: () => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = "infinity-theme";

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") setPreference(saved);
    });
  }, []);

  const resolvedTheme = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;
  const cycleTheme = useCallback(() => {
    const next = preference === "system" ? "light" : preference === "light" ? "dark" : "system";
    setPreference(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, [preference]);
  const value = useMemo(() => ({
    colors: resolvedTheme === "light" ? lightColors : darkColors,
    preference,
    resolvedTheme,
    cycleTheme
  }), [cycleTheme, preference, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
