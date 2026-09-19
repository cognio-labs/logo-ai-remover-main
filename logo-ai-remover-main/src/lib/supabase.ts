import { createClient } from "@supabase/supabase-js";

// Supabase credentials (fallback to placeholders if environment variables are not set)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://pixelrefine-dummy.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase schema reference:
 * 
 * CREATE TABLE public.users (
 *   id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
 *   email TEXT NOT NULL,
 *   name TEXT,
 *   avatar_url TEXT,
 *   plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'professional')),
 *   role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
 *   credits INTEGER DEFAULT 5,
 *   last_credit_reset TIMESTAMPTZ DEFAULT NOW(),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE TABLE public.jobs (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES public.users(id),
 *   file_name TEXT NOT NULL,
 *   file_type TEXT NOT NULL,
 *   file_url TEXT,
 *   result_url TEXT,
 *   status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
 *   error_message TEXT,
 *   quality TEXT DEFAULT '1080p',
 *   credits_used INTEGER DEFAULT 1,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE TABLE public.subscriptions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES public.users(id),
 *   stripe_customer_id TEXT,
 *   stripe_subscription_id TEXT,
 *   plan TEXT NOT NULL,
 *   status TEXT NOT NULL,
 *   current_period_end TIMESTAMPTZ
 * );
 * 
 * CREATE TABLE public.credit_transactions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES public.users(id),
 *   amount INTEGER NOT NULL,
 *   type TEXT CHECK (type IN ('daily_grant', 'purchase', 'deduction', 'refund')),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
