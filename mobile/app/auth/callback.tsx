import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { supabase } from "@/lib/supabase/client";
import { useTheme } from "@/theme/ThemeProvider";
export default function Callback(){
 const router=useRouter(); const { colors } = useTheme(); const params=useLocalSearchParams<{access_token?:string;refresh_token?:string;error_description?:string}>(); const[message,setMessage]=useState("Completing sign in…");
 useEffect(()=>{(async()=>{if(!supabase){setMessage("Supabase is not configured.");return;} if(params.error_description){setMessage(params.error_description);return;} if(params.access_token&&params.refresh_token){const{error}=await supabase.auth.setSession({access_token:params.access_token,refresh_token:params.refresh_token}); if(error){setMessage(error.message);return;}} const{data}=await supabase.auth.getSession(); if(data.session){router.replace("/");} else setMessage("Sign-in link opened, but no session was found.");})();},[params.access_token,params.refresh_token,params.error_description,router]);
 return <Screen><Text style={{color:colors.foreground}}>{message}</Text></Screen>
}
