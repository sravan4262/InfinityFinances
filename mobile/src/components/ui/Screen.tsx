import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
interface ScreenProps extends PropsWithChildren { scroll?: boolean; floating?: ReactNode; }
export function Screen({ children, scroll = true, floating }: ScreenProps) {
 const insets = useSafeAreaInsets(); const { colors } = useTheme(); const styles = makeStyles(colors);
 const body = scroll
  ? <ScrollView style={styles.root} contentContainerStyle={[styles.container,{paddingTop:insets.top+16,paddingBottom:insets.bottom+32}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">{children}</ScrollView>
  : <View style={[styles.root, styles.container, {paddingTop:insets.top+16,paddingBottom:insets.bottom+16}]}>{children}</View>;
 return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>{body}{floating}</KeyboardAvoidingView>;
}
const makeStyles=(colors:ReturnType<typeof useTheme>["colors"])=>StyleSheet.create({root:{flex:1,backgroundColor:colors.background},container:{flexGrow:1,backgroundColor:colors.background,paddingHorizontal:16}});
