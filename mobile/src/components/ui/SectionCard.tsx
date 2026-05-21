import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
export function SectionCard({ title, icon, children, defaultOpen=false }: PropsWithChildren<{title:string; icon?:ReactNode; defaultOpen?:boolean}>) {
 const [open,setOpen]=useState(defaultOpen); const {colors}=useTheme(); const styles=makeStyles(colors);
 return <View style={styles.card}><Pressable onPress={()=>setOpen(!open)} style={styles.header}><View style={styles.titleRow}>{icon}<Text style={styles.title}>{title}</Text></View>{open?<ChevronDown color={colors.mutedForeground} size={18}/>:<ChevronRight color={colors.mutedForeground} size={18}/>}</Pressable>{open?<View style={styles.body}>{children}</View>:null}</View>;
}

const makeStyles=(colors:ReturnType<typeof useTheme>["colors"])=>StyleSheet.create({
 card:{borderWidth:1,borderColor:colors.border,borderRadius:12,overflow:"hidden",backgroundColor:colors.card},
 header:{minHeight:48,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:colors.cardElevated},
 titleRow:{flexDirection:"row",alignItems:"center",gap:8,flex:1,paddingRight:10},
 title:{color:colors.foreground,fontWeight:"800",flexShrink:1},
 body:{padding:14,gap:12}
});
