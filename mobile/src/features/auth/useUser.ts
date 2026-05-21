import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
export function useUser(){const[user,setUser]=useState<User|null|undefined>(undefined);useEffect(()=>{if(!supabase){setUser(null);return;} supabase.auth.getUser().then(({data})=>setUser(data.user??null)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null)); return()=>subscription.unsubscribe();},[]);return{user,loading:user===undefined};}
