"use client";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePathname } from "next/navigation";
export function AuthSessionSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (!isSupabaseConfigured || pathname?.startsWith("/admin")) return;
    // Clear obsolete browser-stored privileged configuration; rotate any key ever placed there.
    localStorage.removeItem("bellix_supabase_service_key");
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void fetch(`/api/bellix/${session ? "session" : "logout"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session ? { access_token: session.access_token } : {}),
      });
    });
    return () => data.subscription.unsubscribe();
  }, [pathname]);
  return null;
}
