import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useApiErrorStore } from "@/lib/api/errorStore";
import { useTheme } from "@/theme/ThemeProvider";

const titleByCode: Record<string, string> = {
  BAD_REQUEST: "Request error",
  UNAUTHORIZED: "Session expired",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Not found",
  RATE_LIMITED: "Slow down",
  CONFLICT: "Conflict",
  SERVICE_UNAVAILABLE: "Service unavailable",
  INTERNAL_ERROR: "Something went wrong",
  NETWORK_ERROR: "Connection problem",
};

export function ApiErrorModal() {
  const { error, clear } = useApiErrorStore();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={!!error} transparent animationType="fade" onRequestClose={clear}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{error ? titleByCode[error.code] ?? "Request failed" : ""}</Text>
          <Text style={styles.message}>{error?.message}</Text>
          <Text style={styles.meta}>{error ? `Error ${error.status} · ${error.code}` : ""}</Text>
          <Pressable onPress={clear} style={styles.button}>
            <Text style={styles.buttonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
    },
    title: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
    message: { color: colors.mutedForeground, fontSize: 14, marginTop: 8, lineHeight: 20 },
    meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 10 },
    button: {
      marginTop: 18,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      alignItems: "center",
    },
    buttonText: { color: colors.primaryForeground, fontWeight: "800" },
  });
