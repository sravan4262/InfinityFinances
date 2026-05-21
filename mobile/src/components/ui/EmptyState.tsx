import { Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
export function EmptyState({title,body}:{title:string;body:string}){const{colors}=useTheme();return <View style={{padding:24,alignItems:"center",gap:6}}><Text style={{color:colors.foreground,fontWeight:"900"}}>{title}</Text><Text style={{color:colors.mutedForeground,textAlign:"center"}}>{body}</Text></View>}
