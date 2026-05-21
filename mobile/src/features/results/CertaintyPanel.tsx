import { useMemo } from "react";
import { Text, View } from "react-native";
import { runMonteCarlo } from "@/lib/engine/monteCarlo";
import { HISTORICAL_SCENARIOS, runHistoricalSequence } from "@/lib/engine/historicalSequences";
import type { FireInputs } from "@/lib/engine/types";
import { useTheme } from "@/theme/ThemeProvider";
export function CertaintyPanel({inputs}:{inputs:FireInputs}){const{colors}=useTheme();const mc=useMemo(()=>runMonteCarlo(inputs),[inputs]);const hist=useMemo(()=>HISTORICAL_SCENARIOS.map(s=>runHistoricalSequence(inputs,s)),[inputs]);return <View style={{gap:10}}><Text style={{color:colors.foreground,fontSize:16,fontWeight:"900"}}>Certainty check</Text><Text style={{color:colors.primary,fontSize:24,fontWeight:"900"}}>{Math.round(mc.successRate*100)}% success</Text><Text style={{color:colors.mutedForeground}}>Median FIRE age {mc.medianFireAge??"—"} · worst p10 depletion {mc.worstCaseDepletionAge??"none"}</Text>{hist.map(h=><View key={h.scenario.label} style={{flexDirection:"row",justifyContent:"space-between"}}><Text style={{color:colors.mutedForeground}}>{h.scenario.shortLabel}</Text><Text style={{color:h.survived?colors.success:colors.destructive,fontWeight:"800"}}>{h.survived?"Survived":"Depleted"}</Text></View>)}</View>}
