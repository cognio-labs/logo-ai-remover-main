// Supabase disabled — running 100% offline/local
export const isSupabaseConfigured = false;
export const DEFAULT_SUPABASE_URL = "";
export const supabase = null as any;
export function getStoredSupabaseConfig() {
  return { url: "", anonKey: "", serviceKey: "" };
}
export async function checkSupabaseConnection() {
  return { connected: false, message: "Supabase disabled (offline mode)" };
}
