"use client";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePathname } from "next/navigation";
export function AuthSessionSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase?.auth?.onAuthStateChange || pathname?.startsWith("/admin")) return;
    try {
      localStorage.removeItem("bellix_supabase_service_key");
      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        void fetch(`/api/bellix/${session ? "session" : "logout"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session ? { access_token: session.access_token } : {}),
        });
      });
      return () => data?.subscription?.unsubscribe?.();
    } catch {
      return;
    }
  }, [pathname]);
  return null;
}
