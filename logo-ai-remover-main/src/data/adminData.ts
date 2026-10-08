// ==============================================================================
// Bellix.us Supabase Schema Table Metadata & SQL Query Presets
// ==============================================================================

export interface SchemaTableInfo {
  name: string;
  description: string;
  columns: { name: string; type: string; key?: "PK" | "FK"; nullable?: boolean }[];
}

// 16 Real Supabase Schema Tables Metadata
export const SCHEMA_TABLES: SchemaTableInfo[] = [
  {
    name: "users",
    description: "User profiles, roles, billing tier & credit balances",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "email", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "role", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "country", type: "TEXT" },
      { name: "plan", type: "TEXT" },
      { name: "credits", type: "INTEGER" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "plans",
    description: "Subscription tiers, pricing, quotas & feature limits",
    columns: [
      { name: "id", type: "TEXT", key: "PK" },
      { name: "name", type: "TEXT" },
      { name: "price_monthly", type: "NUMERIC" },
      { name: "price_annual", type: "NUMERIC" },
      { name: "credits", type: "INTEGER" },
      { name: "limits_json", type: "JSONB" },
      { name: "features_json", type: "JSONB" },
      { name: "active", type: "BOOLEAN" },
    ],
  },
  {
    name: "subscriptions",
    description: "Stripe recurring subscriptions & billing cycles",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "plan_id", type: "TEXT", key: "FK" },
      { name: "stripe_subscription_id", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "renews_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "credit_ledger",
    description: "Audit trail for every credit deduction and refill",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "change", type: "INTEGER" },
      { name: "reason", type: "TEXT" },
      { name: "balance_after", type: "INTEGER" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "jobs",
    description: "All processing tasks across 6 AI neural engines",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "tool", type: "TEXT" },
      { name: "file_name", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "credits", type: "INTEGER" },
      { name: "gpu_seconds", type: "NUMERIC" },
      { name: "cost", type: "NUMERIC" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "tools",
    description: "Tool engine settings, models, limits & credit costs",
    columns: [
      { name: "id", type: "TEXT", key: "PK" },
      { name: "slug", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "enabled", type: "BOOLEAN" },
      { name: "credit_cost", type: "INTEGER" },
      { name: "max_size_mb", type: "INTEGER" },
      { name: "default_model", type: "TEXT" },
    ],
  },
  {
    name: "payments",
    description: "Stripe checkout transactions, receipts & refunds",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "amount", type: "NUMERIC" },
      { name: "currency", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "stripe_payment_id", type: "TEXT" },
      { name: "refunded", type: "BOOLEAN" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "coupons",
    description: "Promo codes, percentage/fixed discounts & expiry",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "code", type: "TEXT" },
      { name: "type", type: "TEXT" },
      { name: "value", type: "NUMERIC" },
      { name: "max_uses", type: "INTEGER" },
      { name: "used", type: "INTEGER" },
      { name: "active", type: "BOOLEAN" },
    ],
  },
  {
    name: "api_keys",
    description: "Developer API access tokens for Studio & API plan",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "key_prefix", type: "TEXT" },
      { name: "rate_limit_per_minute", type: "INTEGER" },
      { name: "revoked", type: "BOOLEAN" },
    ],
  },
  {
    name: "webhooks",
    description: "Event callbacks for completed/failed async rendering",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "url", type: "TEXT" },
      { name: "secret", type: "TEXT" },
      { name: "last_status", type: "INTEGER" },
    ],
  },
  {
    name: "tickets",
    description: "Customer support inquiries & resolution tracker",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_email", type: "TEXT" },
      { name: "subject", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "priority", type: "TEXT" },
      { name: "assignee", type: "TEXT" },
    ],
  },
  {
    name: "abuse_reports",
    description: "DMCA notices, copyright flags & moderation queue",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "reporter", type: "TEXT" },
      { name: "type", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "decision", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
  {
    name: "content_pages",
    description: "CMS landing page content & SEO metadata blocks",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "slug", type: "TEXT" },
      { name: "title", type: "TEXT" },
      { name: "seo_json", type: "JSONB" },
      { name: "status", type: "TEXT" },
    ],
  },
  {
    name: "faq_items",
    description: "Public FAQ questions, answers & category ordering",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "question", type: "TEXT" },
      { name: "answer", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "active", type: "BOOLEAN" },
    ],
  },
  {
    name: "affiliates",
    description: "Referral program tracking, clicks & payouts",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "user_id", type: "UUID", key: "FK" },
      { name: "code", type: "TEXT" },
      { name: "commission_rate", type: "NUMERIC" },
      { name: "balance", type: "NUMERIC" },
    ],
  },
  {
    name: "audit_logs",
    description: "Security logging of all administrative actions & IPs",
    columns: [
      { name: "id", type: "UUID", key: "PK" },
      { name: "admin_email", type: "TEXT" },
      { name: "action", type: "TEXT" },
      { name: "entity", type: "TEXT" },
      { name: "entity_id", type: "TEXT" },
      { name: "ip", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
  },
];

// Preset SQL Queries for Real SQL Console
export const PRESET_SQL_QUERIES = [
  {
    name: "📊 System Health & Row Counts",
    description: "Query exact live counts across all primary tables in Supabase",
    sql: `SELECT 'users' AS table_name, count(*) AS total_rows FROM public.users
UNION ALL SELECT 'jobs', count(*) FROM public.jobs
UNION ALL SELECT 'plans', count(*) FROM public.plans
UNION ALL SELECT 'tools', count(*) FROM public.tools
UNION ALL SELECT 'payments', count(*) FROM public.payments
UNION ALL SELECT 'coupons', count(*) FROM public.coupons
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs;`,
  },
  {
    name: "👥 All Registered Users",
    description: "Inspect users, credit balances, roles and subscription tiers",
    sql: `SELECT id, email, name, role, plan, credits, status, country, created_at 
FROM public.users 
ORDER BY created_at DESC;`,
  },
  {
    name: "🛠️ Active AI Tools Configuration",
    description: "Inspect all 6 neural AI tools, credit costs, and backend model versions",
    sql: `SELECT id, name, slug, enabled, credit_cost, max_size_mb, default_model 
FROM public.tools 
ORDER BY id;`,
  },
  {
    name: "💳 Subscription Plans & Pricing",
    description: "Single source of truth pricing tiers ($0 Free, $39 Creator Pro, $99 Studio)",
    sql: `SELECT id, name, price_monthly, price_annual, credits, active 
FROM public.plans 
ORDER BY price_monthly;`,
  },
  {
    name: "📜 Recent Security Audit Logs",
    description: "Review latest admin actions, credit mutations, and status changes",
    sql: `SELECT id, admin_email, action, entity, entity_id, ip, created_at 
FROM public.audit_logs 
ORDER BY created_at DESC 
LIMIT 20;`,
  },
];
