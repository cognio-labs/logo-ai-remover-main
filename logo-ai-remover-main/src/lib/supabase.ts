import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase project defaults
export const DEFAULT_SUPABASE_URL = "https://aspuvqzpmlccppweutso.supabase.co";

export function getStoredSupabaseConfig() {
  if (typeof window === "undefined") {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: "",
      serviceKey: "",
    };
  }

  const storedUrl = localStorage.getItem("bellix_supabase_url");
  const storedAnon = localStorage.getItem("bellix_supabase_anon_key");
  const storedService = localStorage.getItem("bellix_supabase_service_key");

  const envUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const envAnon =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  return {
    url: storedUrl || envUrl || DEFAULT_SUPABASE_URL,
    anonKey: storedAnon || envAnon || "",
    serviceKey: storedService || "",
  };
}

export function saveStoredSupabaseConfig(config: {
  url?: string;
  anonKey?: string;
  serviceKey?: string;
}) {
  if (typeof window === "undefined") return;
  if (config.url !== undefined) localStorage.setItem("bellix_supabase_url", config.url);
  if (config.anonKey !== undefined)
    localStorage.setItem("bellix_supabase_anon_key", config.anonKey);
  if (config.serviceKey !== undefined)
    localStorage.setItem("bellix_supabase_service_key", config.serviceKey);
}

const initialConfig = getStoredSupabaseConfig();

// Fallback dummy key for initialization if none provided
const fallbackAnonKey =
  initialConfig.anonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_client_init";

export let supabase: SupabaseClient = createClient(initialConfig.url, fallbackAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function refreshSupabaseClient(url?: string, key?: string) {
  const current = getStoredSupabaseConfig();
  const targetUrl = url || current.url;
  const targetKey = key || current.anonKey || fallbackAnonKey;
  supabase = createClient(targetUrl, targetKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
}

export const isSupabaseConfigured = Boolean(
  getStoredSupabaseConfig().anonKey && getStoredSupabaseConfig().anonKey.length > 20,
);

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tablesCount?: number;
}> {
  const config = getStoredSupabaseConfig();
  if (!config.anonKey || config.anonKey.length < 20) {
    return {
      connected: false,
      message:
        "Supabase Publishable/Anon Key is not configured yet. Add your key in the SQL Editor or Settings tab to connect live.",
    };
  }

  try {
    const client = refreshSupabaseClient();
    const { data, error } = await client.from("plans").select("id").limit(1);
    if (error) {
      if (error.code === "42P01") {
        return {
          connected: true,
          message:
            "Connected to Supabase! Tables need to be created. Run the migration script in the SQL Command Editor tab.",
        };
      }
      return {
        connected: false,
        message: `Supabase response: ${error.message}`,
      };
    }
    return {
      connected: true,
      message: "Connected to Supabase live database successfully!",
      tablesCount: data ? 1 : 0,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Connection failed: ${errorMsg}`,
    };
  }
}
