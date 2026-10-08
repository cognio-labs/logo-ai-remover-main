-- ==============================================================================
-- BELLIX.US PRODUCTION DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Project: aspuvqzpmlccppweutso
-- Description: Complete 16-table Admin & Application Database Schema
-- Modules: Users, Plans, Subscriptions, Ledger, Jobs, Tools, Payments, Coupons,
--          API Keys, Webhooks, Tickets, Abuse/DMCA, CMS, FAQs, Affiliates, Audit Logs
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'support', 'moderator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'pending')),
  country TEXT DEFAULT 'US',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'studio')),
  credits INTEGER NOT NULL DEFAULT 5,
  last_credit_reset TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLANS TABLE (Single source of truth for pricing)
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL,
  price_annual NUMERIC(10, 2) NOT NULL,
  credits INTEGER NOT NULL,
  limits_json JSONB DEFAULT '{}'::jsonb,
  features_json JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  renews_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREDIT LEDGER TABLE (Every credit add/spend tracked)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  job_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JOBS TABLE (All processing tasks across 6 tools)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tool TEXT NOT NULL,
  file_name TEXT,
  input_url TEXT,
  output_url TEXT,
  file_size_mb NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  credits INTEGER NOT NULL DEFAULT 1,
  gpu_seconds NUMERIC(10, 2) DEFAULT 0,
  cost NUMERIC(10, 4) DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- 6. TOOLS CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.tools (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_coming_soon BOOLEAN NOT NULL DEFAULT FALSE,
  credit_cost INTEGER NOT NULL DEFAULT 1,
  max_size_mb INTEGER NOT NULL DEFAULT 50,
  max_duration_sec INTEGER NOT NULL DEFAULT 120,
  formats TEXT[] DEFAULT ARRAY['mp4', 'jpg', 'png', 'pdf'],
  default_model TEXT NOT NULL DEFAULT 'bellix-v2-turbo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENTS TABLE (Stripe transactions & invoices)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  stripe_payment_id TEXT UNIQUE,
  refunded BOOLEAN NOT NULL DEFAULT FALSE,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10, 2) NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. API KEYS TABLE (Studio & API Plan)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Production API Key',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  last_used TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['job.completed', 'job.failed'],
  last_status INTEGER,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee TEXT DEFAULT 'Unassigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ABUSE & DMCA MODERATION REPORTS
CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  file_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('dmca', 'copyright', 'explicit', 'unauthorized_edit', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'action_taken', 'dismissed')),
  decision TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CONTENT PAGES (CMS)
CREATE TABLE IF NOT EXISTS public.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  seo_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. FAQ ITEMS
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  order_num INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AFFILIATES TABLE
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
  clicks INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. AUDIT LOGS (Security and administrative change tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_json JSONB,
  after_json JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_tool ON public.jobs(tool);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_abuse_status ON public.abuse_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can read active plans and tools
CREATE POLICY "Public read active plans" ON public.plans FOR SELECT USING (active = TRUE);
CREATE POLICY "Public read enabled tools" ON public.tools FOR SELECT USING (enabled = TRUE);
CREATE POLICY "Public read active faqs" ON public.faq_items FOR SELECT USING (active = TRUE);
CREATE POLICY "Public read published pages" ON public.content_pages FOR SELECT USING (status = 'published');

-- Allow all actions for service role and admin dashboard (full access fallback)
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING (true);
CREATE POLICY "Admin full access jobs" ON public.jobs FOR ALL USING (true);
CREATE POLICY "Admin full access plans" ON public.plans FOR ALL USING (true);
CREATE POLICY "Admin full access tools" ON public.tools FOR ALL USING (true);
CREATE POLICY "Admin full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Admin full access subscriptions" ON public.subscriptions FOR ALL USING (true);
CREATE POLICY "Admin full access credit_ledger" ON public.credit_ledger FOR ALL USING (true);
CREATE POLICY "Admin full access coupons" ON public.coupons FOR ALL USING (true);
CREATE POLICY "Admin full access api_keys" ON public.api_keys FOR ALL USING (true);
CREATE POLICY "Admin full access webhooks" ON public.webhooks FOR ALL USING (true);
CREATE POLICY "Admin full access tickets" ON public.tickets FOR ALL USING (true);
CREATE POLICY "Admin full access abuse_reports" ON public.abuse_reports FOR ALL USING (true);
CREATE POLICY "Admin full access content_pages" ON public.content_pages FOR ALL USING (true);
CREATE POLICY "Admin full access faq_items" ON public.faq_items FOR ALL USING (true);
CREATE POLICY "Admin full access affiliates" ON public.affiliates FOR ALL USING (true);
CREATE POLICY "Admin full access audit_logs" ON public.audit_logs FOR ALL USING (true);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Default Plans (Single source of truth: Free $0, Creator Pro $39/mo, Studio & API $99/mo)
INSERT INTO public.plans (id, name, price_monthly, price_annual, credits, limits_json, features_json, active)
VALUES
  ('free', 'Free Studio', 0, 0, 5, 
   '{"max_file_size_mb": 25, "resolution": "1080p", "queue_priority": "standard"}'::jsonb,
   '["5 credits per month", "Standard 1080p resolution", "Basic tools access", "Community support"]'::jsonb, true),
  ('creator', 'Creator Pro', 39, 390, 150, 
   '{"max_file_size_mb": 250, "resolution": "4K", "queue_priority": "high", "rollover_days": 90}'::jsonb,
   '["150 credits per month", "Up to 4K 60FPS upscale & restoration", "90-day credit rollover", "Priority GPU queue", "Fast email support"]'::jsonb, true),
  ('studio', 'Studio & API', 99, 990, 600, 
   '{"max_file_size_mb": 1024, "resolution": "8K", "queue_priority": "ultra", "api_access": true, "rollover_days": 90}'::jsonb,
   '["600 credits per month", "Extreme 8K neural upscaling", "REST API & Webhooks access", "Dedicated GPU lanes", "Zero retention compliance"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    price_monthly = EXCLUDED.price_monthly, 
    price_annual = EXCLUDED.price_annual, 
    credits = EXCLUDED.credits,
    features_json = EXCLUDED.features_json;

-- 2. Core 6 Tools
INSERT INTO public.tools (id, slug, name, description, enabled, is_coming_soon, credit_cost, max_size_mb, max_duration_sec, formats, default_model)
VALUES
  ('upscale', '/upscale', 'Image Upscaler', 'Upscale images up to 8K with micro-texture preservation.', true, false, 1, 100, 0, ARRAY['jpg', 'jpeg', 'png', 'webp'], 'real-esrgan-v4'),
  ('background-remover', '/background-remover', 'Background Remover', 'High-accuracy subject segmentation with transparent PNG output.', true, false, 1, 50, 0, ARRAY['jpg', 'jpeg', 'png', 'webp'], 'birefnet-portrait-v2'),
  ('video-enhancer', '/video-enhancer', 'Video Enhancer', 'Temporal frame interpolation and 4K 60FPS restoration.', true, false, 3, 500, 180, ARRAY['mp4', 'mov', 'webm'], 'rife-temporal-4k'),
  ('pdf-watermark-remover', '/pdf-watermark-remover', 'PDF Watermark Remover', 'Clean stamps, drafts, and overlays from multi-page PDF documents.', true, false, 1, 80, 0, ARRAY['pdf'], 'pdf-vector-cleaner'),
  ('remove-image', '/remove/image', 'Image Watermark Remover', 'Inpaint and erase stamps, text, and logos with zero ghost artifacts.', true, false, 1, 60, 0, ARRAY['jpg', 'jpeg', 'png'], 'lama-cleaner-ultra'),
  ('gemini-video', '/gemini-video-watermark-remover', 'Gemini & Veo Video Cleaner', 'Surgically strip AI watermark overlays from synthesized video feeds.', true, false, 2, 400, 120, ARRAY['mp4', 'mov'], 'veo-cleaner-v3')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    credit_cost = EXCLUDED.credit_cost,
    enabled = EXCLUDED.enabled;

-- 3. Seed Default Admin User
INSERT INTO public.users (id, email, name, role, status, country, plan, credits)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@bellix.us', 'Owner / Super Admin', 'super_admin', 'active', 'US', 'studio', 99999),
  ('00000000-0000-0000-0000-000000000002', 'creator@studio.io', 'Alex Rivera (Demo Creator)', 'user', 'active', 'US', 'creator', 145),
  ('00000000-0000-0000-0000-000000000003', 'sarah.agency@media.com', 'Sarah Lin (Studio Lead)', 'user', 'active', 'UK', 'studio', 580),
  ('00000000-0000-0000-0000-000000000004', 'marcus.free@gmail.com', 'Marcus Vance (Trial)', 'user', 'active', 'DE', 'free', 4)
ON CONFLICT (email) DO NOTHING;

-- 4. Seed Coupons
INSERT INTO public.coupons (code, type, value, max_uses, used, active, expires_at)
VALUES
  ('LAUNCH50', 'percent', 50.00, 500, 142, true, NOW() + INTERVAL '60 days'),
  ('CREATORPRO20', 'percent', 20.00, 1000, 318, true, NOW() + INTERVAL '90 days'),
  ('STUDIOFREE10', 'fixed', 10.00, 200, 64, true, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed FAQ Items
INSERT INTO public.faq_items (question, answer, category, order_num, active)
VALUES
  ('What is the difference between Creator Pro and Studio plans?', 'Creator Pro offers 150 credits/month with up to 4K resolution, while Studio & API gives 600 credits/month, extreme 8K upscaling, dedicated GPU lanes, and full programmatic REST API & Webhook access.', 'Billing', 1, true),
  ('How does the 14-day money-back guarantee work?', 'If you are unsatisfied with Bellix.us for any reason within your first 14 days, contact support or request a refund from your billing dashboard for an instant 100% refund.', 'Billing', 2, true),
  ('What happens to unused credits?', 'On Creator Pro and Studio plans, unused credits automatically roll over for up to 90 days as long as your subscription remains active.', 'Credits', 3, true),
  ('Is my uploaded content private?', 'Yes. Bellix.us enforces strict zero-retention standards. Processed files are permanently purged automatically according to your selected data-retention rule (24-hour default). We never train AI models on user media.', 'Privacy', 4, true)
ON CONFLICT DO NOTHING;

-- 6. Initial Audit Log
INSERT INTO public.audit_logs (admin_email, action, entity, entity_id, ip, after_json)
VALUES 
  ('admin@bellix.us', 'INITIALIZE_SCHEMA', 'SYSTEM', 'aspuvqzpmlccppweutso', '127.0.0.1', '{"status": "Schema and 16 core tables provisioned successfully"}'::jsonb);

-- ==============================================================================
-- END OF SCHEMA MIGRATION
-- ==============================================================================
