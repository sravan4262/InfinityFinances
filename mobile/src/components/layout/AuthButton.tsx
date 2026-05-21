import { useRouter } from "expo-router";
import { LogIn, User as UserIcon } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { useUser } from "@/features/auth/useUser";
import { useTheme } from "@/theme/ThemeProvider";

export function AuthButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useUser();
  const signedIn = Boolean(user);
  const label = signedIn ? (user?.email ?? "Account") : "Sign in";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={signedIn ? "Account" : "Sign in"}
      onPress={() => router.push("/auth/login")}
      style={{
        minHeight: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: signedIn ? colors.border : colors.primary,
        backgroundColor: signedIn ? colors.card : colors.primary,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        maxWidth: 180
      }}
    >
      {signedIn ? (
        <UserIcon size={14} color={colors.mutedForeground} />
      ) : (
        <LogIn size={14} color={colors.primaryForeground} />
      )}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          color: signedIn ? colors.mutedForeground : colors.primaryForeground,
          fontSize: 12,
          fontWeight: "800",
          flexShrink: 1
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
