import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { tap } from "@/lib/haptics";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
}

export function AppButton({ label, onPress, disabled, loading, icon, variant = "primary" }: AppButtonProps) {
 const { colors } = useTheme();
 const styles = makeStyles(colors);
 const handlePress = () => { tap(); onPress(); };
 return (
  <Pressable
   onPress={handlePress}
   disabled={disabled || loading}
   style={({ pressed }) => [
    styles.button,
    styles[variant],
    pressed && !disabled ? styles.pressed : null,
    disabled ? styles.disabled : null
   ]}
  >
   {loading ? (
    <ActivityIndicator color={variant === "primary" || variant === "destructive" ? colors.primaryForeground : colors.primary} />
   ) : (
    <View style={styles.content}>{icon}<Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text></View>
   )}
  </Pressable>
 );
}
const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
 button:{minHeight:52,borderRadius:14,alignItems:"center",justifyContent:"center",paddingHorizontal:18,borderWidth:1,borderColor:"transparent"},
 primary:{backgroundColor:colors.primary},
 secondary:{backgroundColor:colors.card,borderColor:colors.border},
 destructive:{backgroundColor:colors.destructive},
 ghost:{backgroundColor:"transparent"},
 pressed:{opacity:0.82,transform:[{scale:0.99}]},
 disabled:{backgroundColor:colors.muted,opacity:0.65},
 content:{flexDirection:"row",alignItems:"center",gap:8},
 label:{fontWeight:"700",fontSize:16},
 primaryLabel:{color:colors.primaryForeground},
 secondaryLabel:{color:colors.foreground},
 destructiveLabel:{color:colors.primaryForeground},
 ghostLabel:{color:colors.primary}
});
