// Supabase disabled — running 100% offline/local
export const isSupabaseConfigured = false;
export const DEFAULT_SUPABASE_URL = "";

const dummySubscription = {
  unsubscribe: () => {},
};

const dummyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: (_callback?: any) => ({
    data: { subscription: dummySubscription },
    error: null,
  }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
};

const dummyQueryBuilder: any = {
  select: () => dummyQueryBuilder,
  insert: () => dummyQueryBuilder,
  update: () => dummyQueryBuilder,
  delete: () => dummyQueryBuilder,
  eq: () => dummyQueryBuilder,
  neq: () => dummyQueryBuilder,
  single: async () => ({ data: null, error: null }),
  maybeSingle: async () => ({ data: null, error: null }),
  order: () => dummyQueryBuilder,
  range: () => dummyQueryBuilder,
  limit: () => dummyQueryBuilder,
  then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
};

export const supabase = {
  auth: dummyAuth,
  from: () => dummyQueryBuilder,
  rpc: async () => ({ data: null, error: null }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;

export function getStoredSupabaseConfig() {
  return { url: "", anonKey: "", serviceKey: "" };
}
export async function checkSupabaseConnection() {
  return { connected: false, message: "Supabase disabled (offline mode)" };
}
