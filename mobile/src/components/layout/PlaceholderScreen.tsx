import { Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/ThemeProvider";
export function PlaceholderScreen({ title, detail }: { title: string; detail: string }) {
 const { colors } = useTheme();
 return <Screen><View style={{ flex: 1, justifyContent: "center", gap: 10, paddingVertical: 48 }}><Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "900" }}>{title}</Text><Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 22 }}>{detail}</Text></View></Screen>;
}
