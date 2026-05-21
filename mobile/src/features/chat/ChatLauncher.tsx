import { useState } from "react";
import { Pressable, Text, ToastAndroid, Platform, Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle } from "lucide-react-native";
import { useUser } from "@/features/auth/useUser";
import { useFeatureFlag } from "@/lib/hooks/useFeatureFlag";
import { useChatArea } from "@/lib/hooks/useChatArea";
import { useTheme } from "@/theme/ThemeProvider";
import { selection } from "@/lib/haptics";
import { ChatPanel } from "./ChatPanel";

// Single chat surface mounted in the root navigator. Hidden when:
//  - not signed in
//  - feature flag `chat` is off or still loading
//  - active route doesn't map to a chat area
export function ChatLauncher() {
  const { user, loading: userLoading } = useUser();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("chat");
  const { area, enabled, disabledReason } = useChatArea();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (userLoading || flagLoading) return null;
  if (!user) return null;
  if (!flagEnabled) return null;
  if (!area) return null;

  const showTooltip = () => {
    if (!disabledReason) return;
    if (Platform.OS === "android") ToastAndroid.show(disabledReason, ToastAndroid.SHORT);
    else Alert.alert("Tip", disabledReason);
  };

  return (
    <>
      {!open && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: insets.bottom + 16 + 56 /* tab bar */,
            right: 16,
            zIndex: 999,
          }}
        >
          <Pressable
            onPress={() => {
              selection();
              setOpen(true);
            }}
            onLongPress={showTooltip}
            hitSlop={10}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: enabled ? colors.primary : colors.cardElevated,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: enabled ? 0 : 1,
              borderColor: colors.border,
              shadowColor: colors.primary,
              shadowOpacity: enabled ? 0.35 : 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <MessageCircle
              size={16}
              color={enabled ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={{
                color: enabled ? colors.primaryForeground : colors.mutedForeground,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              Ask AI
            </Text>
          </Pressable>
        </View>
      )}
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
