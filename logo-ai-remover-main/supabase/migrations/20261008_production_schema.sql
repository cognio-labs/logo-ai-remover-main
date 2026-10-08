-- ==============================================================================
-- BELLIX.US PRODUCTION DATABASE SCHEMA MIGRATION (IDEMPOTENT)
-- Phase 1 & System Requirements Migration
-- Safe execution: Uses IF NOT EXISTS, does not drop tables or delete data.
-- ==============================================================================

-- 1. AI USAGE TRACKING TABLE (Phase 7 - Token & cost accounting)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  request_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  usage_status TEXT NOT NULL DEFAULT 'ok' CHECK (usage_status IN ('ok', 'unavailable', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast daily/monthly AI usage aggregation (Phase 8 & 9)
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage (user_id, created_at);

-- 2. ADMIN USERS TABLE (Explicit Admin Permissions & Roles)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SYSTEM SETTINGS TABLE (Phase 15 - Persisted Admin Configs)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TICKET MESSAGES TABLE (Support Desk Threading)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'support', 'admin', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages (ticket_id, created_at);

-- 5. EXTEND PLANS TABLE WITH ENTERPRISE FIELDS (Phase 2 & 3)
DO $$
BEGIN
  -- Add status column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='status') THEN
    ALTER TABLE public.plans ADD COLUMN status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  -- Add daily_ai_tokens column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='daily_ai_tokens') THEN
    ALTER TABLE public.plans ADD COLUMN daily_ai_tokens INTEGER NOT NULL DEFAULT 5000;
  END IF;

  -- Add monthly_ai_tokens column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='monthly_ai_tokens') THEN
    ALTER TABLE public.plans ADD COLUMN monthly_ai_tokens INTEGER NOT NULL DEFAULT 100000;
  END IF;

  -- Add daily_requests column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='daily_requests') THEN
    ALTER TABLE public.plans ADD COLUMN daily_requests INTEGER NOT NULL DEFAULT 20;
  END IF;

  -- Add monthly_requests column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='monthly_requests') THEN
    ALTER TABLE public.plans ADD COLUMN monthly_requests INTEGER NOT NULL DEFAULT 500;
  END IF;

  -- Add max_file_size column if not exists (in MB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='max_file_size') THEN
    ALTER TABLE public.plans ADD COLUMN max_file_size INTEGER NOT NULL DEFAULT 25;
  END IF;

  -- Add max_video_duration column if not exists (in seconds)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='max_video_duration') THEN
    ALTER TABLE public.plans ADD COLUMN max_video_duration INTEGER NOT NULL DEFAULT 60;
  END IF;

  -- Add enabled_tools column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='enabled_tools') THEN
    ALTER TABLE public.plans ADD COLUMN enabled_tools TEXT[] NOT NULL DEFAULT ARRAY['upscale', 'background', 'pdf', 'image_watermark', 'video_watermark', 'video_enhancer'];
  END IF;

  -- Add api_access column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='api_access') THEN
    ALTER TABLE public.plans ADD COLUMN api_access BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Add webhook_access column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='webhook_access') THEN
    ALTER TABLE public.plans ADD COLUMN webhook_access BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Add priority column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plans' AND column_name='priority') THEN
    ALTER TABLE public.plans ADD COLUMN priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'high', 'ultra'));
  END IF;
END $$;

-- 6. ATOMIC CREDIT DEDUCTION & LEDGER TRANSACTION (Phase 11 - Double Spending Prevention)
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_job_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Row-level lock to prevent concurrent race conditions
  SELECT credits INTO v_current_credits
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_current_credits < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'INSUFFICIENT_CREDITS', 
      'current_credits', v_current_credits,
      'required_credits', p_amount
    );
  END IF;

  v_new_credits := v_current_credits - p_amount;

  -- Update user balance
  UPDATE public.users
  SET credits = v_new_credits
  WHERE id = p_user_id;

  -- Insert immutable ledger entry
  INSERT INTO public.credit_ledger (
    user_id, 
    change, 
    reason, 
    job_id, 
    balance_after, 
    created_at
  )
  VALUES (
    p_user_id, 
    -p_amount, 
    p_reason, 
    p_job_id, 
    v_new_credits, 
    NOW()
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'success', true, 
    'new_balance', v_new_credits, 
    'ledger_id', v_ledger_id
  );
END;
$$;

-- 7. SEED DEFAULT SETTINGS (Phase 15 - Settings if not exists)
INSERT INTO public.settings (id, category, value)
VALUES
  ('ai_config', 'ai', '{"default_model": "google/gemma-4-26b-a4b-it:free", "fallback_model": "openrouter/free", "timeout_seconds": 45, "max_tokens": 1000}'::jsonb),
  ('branding', 'general', '{"platform_name": "Bellix.us", "support_email": "support@bellix.us", "maintenance_mode": false}'::jsonb),
  ('retention_policy', 'storage', '{"job_retention_hours": 24, "cleanup_cron_enabled": true}'::jsonb),
  ('stripe_config', 'billing', '{"status": "not_connected", "mode": "test", "webhook_configured": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow public read of published plans only (Phase 2 requirement)
DROP POLICY IF EXISTS "Public read published plans" ON public.plans;
CREATE POLICY "Public read published plans" ON public.plans
  FOR SELECT USING (status = 'published' AND active = TRUE);

-- Allow public read of system settings
DROP POLICY IF EXISTS "Public read general settings" ON public.settings;
CREATE POLICY "Public read general settings" ON public.settings
  FOR SELECT USING (category IN ('general', 'branding'));

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access ai_usage" ON public.ai_usage;
CREATE POLICY "Service role full access ai_usage" ON public.ai_usage
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access settings" ON public.settings;
CREATE POLICY "Service role full access settings" ON public.settings
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access admin_users" ON public.admin_users;
CREATE POLICY "Service role full access admin_users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access ticket_messages" ON public.ticket_messages;
CREATE POLICY "Service role full access ticket_messages" ON public.ticket_messages
  FOR ALL USING (auth.role() = 'service_role');
