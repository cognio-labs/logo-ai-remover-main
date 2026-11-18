# Bellix admin, billing and credits

## Current state

Repository implementation, not a live deployment. The production database has not been inspected or migrated because its service/database credentials are missing. No real payment, mandate, refund or email has been sent. Never enable live purchases before completing policies and gateway tests below.

The private entry point is `/admin`. Public account pages no longer link to it. Every admin server operation independently checks Supabase identity and role. Hiding a link is not the access control. The username alias is optional and maps to a real Supabase account; the password is that account's Supabase Auth password, never a hardcoded browser secret. Admin sessions use an HTTP-only cookie and expire with the issued access token; sign in again when expired.

## Environment

Copy missing fields from `.env.billing.example` into `.env.local` and the production host's server environment; preserve existing values. The template contains placeholders only. Also configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BELLIX_INTERNAL_URL` and `BELLIX_WORKER_SECRET` on the Python processing service. Public Supabase URL and publishable/anon key are expected browser configuration; privileged keys are server-only.

Optional `ADMIN_LOGIN_USERNAME` may be your chosen username (including `bellix@1234@`); set `ADMIN_LOGIN_EMAIL` to the actual verified owner email. Set the password through Supabase Auth. Passwords are never prefilled by the application. Team members sign in with their verified email and own password.

`BELLIX_INTERNAL_URL` must resolve from the processing service to the Next.js service. `x-forwarded-for` must be overwritten by a trusted proxy for login/contact rate limits. Do not accept arbitrary untrusted copies at a directly reachable backend.

## Database migration order

Back up the production database and export a schema-only dump first. Review existing tables/functions and migrate on a staging project before production. Existing repository migrations use the separate `bellix` schema and reference managed `auth.users`; do not blindly replay the legacy `20261008_production_schema.sql` on an existing project.

Apply these once, in this order, using Supabase SQL Editor or a trusted migration runner:

1. `supabase/migrations/202611180001_bellix_core.sql`
2. `supabase/migrations/202611180002_billing_admin.sql`
3. `supabase/migrations/202611180003_notifications.sql`
4. `supabase/migrations/202611180004_bootstrap.sql`
5. `supabase/migrations/202611180005_delivery.sql`
6. `supabase/migrations/202611180006_atomic_reconciliation.sql`
7. `supabase/migrations/202611180007_team_access.sql`
8. `supabase/migrations/202611180008_recurring.sql`
9. `supabase/migrations/202611180009_recurring_reminders.sql`

Add `bellix` to the Supabase Data API exposed schemas so the server can query it. RLS and grants still prevent browser financial mutations. Review migration 002's revocation of legacy browser access against any existing integrations. No financial history is deleted.

## First superadmin and team

Create a real account through `/account`, verify its email, and obtain its UUID from Supabase Auth. Then run from the Next.js project directory:

```powershell
node --env-file=.env.local scripts/bootstrap-superadmin.mjs VERIFIED_USER_UUID "Initial Bellix owner setup"
```

The bootstrap RPC requires a verified account and rejects a second first-superadmin bootstrap. `/admin/roles` adds/removes support-admin access for already verified accounts by email and records the reason in the audit log. It does not claim an invitation email was sent. Support admins can view users and manage contact messages; pricing, credits, roles and financial operations require superadmin.

## Plans and Razorpay test mode

Keep `RAZORPAY_MODE=test` and matching `rzp_test_...` credentials until full staging verification. No paid price or allowance is seeded. Create drafts at `/admin/plans`, configure actual amounts in minor currency units and per-tool limits, then explicitly publish. Use a new family/version for changes; existing orders and periods retain snapshots. Paid browser-only algorithms cannot be secured by a UI gate: publication rejects plans containing paid allowances for the browser image tools until a trusted server capability is implemented. Trial browser outcomes remain client-reported. Video processing is reserved/settled by the trusted Python backend with actual metadata and ownership checks.

One-time checkout uses `/api/payments/create-order`, `/api/payments/verify` and `/api/payments/webhook`. `/checkout?plan=PLAN_UUID` loads trusted published pricing. `/payment/status?order=ORDER_UUID` reads only the authenticated owner's backend-confirmed order state.

Automatic renewal uses actual Razorpay Subscriptions. Create a Razorpay plan in the same environment with interval 1 and matching weekly/monthly period, amount and currency. On `/admin/plans`, configure its provider plan ID, cycle count and Bellix published version. The server fetches the provider plan to verify it. Once a mandate exists, create a new Bellix plan version instead of changing its recurring configuration. Checkout then offers an explicit automatic-renewal choice; no benefits are granted on mandate authorization alone. Captured payments require a matching paid invoice, owned contract, amount/currency/environment and provider billing timestamps before transactional, exactly-once fulfillment.

Existing manual periods delay a new recurring mandate's billing start. Switching between already existing automatic mandates is intentionally rejected: cancel the current renewal first and wait for provider-confirmed cancellation, then create the replacement. Immediate prorated upgrades are not implemented.

Configure Razorpay webhook URL:

```text
https://www.bellix.us/api/payments/webhook
```

Use a separate webhook secret. Subscribe to payment captured/failed, order paid, refund processed/failed, and subscription charged/authenticated/activated/pending/halted/cancelled/completed/expired events supported by the account. Raw-body HMAC verification is mandatory. Provider state is fetched again, so webhook payloads alone cannot activate access. For captured-payment reconciliation, a superadmin can POST `{ "payment_id": "pay_..." }` to `/api/bellix/reconcile` from an authenticated same-origin request. Failed/ambiguous order creation blocks new attempts rather than blindly creating duplicates. Subscription events can recover ambiguous mandate creation from a provider-fetched internal contract note. If no event arrives, reconcile the provider reference before allowing another mandate.

Test actual Orders, mandate authentication, successful/failed recurring charges, cancellation, delayed webhooks and refunds on a staging database. These external tests are pending credentials. A captured payment refunded later revokes remaining associated benefits; finalize and review the public refund policy before live mode.

## Notifications, scheduler and email

In-app reminders are generated by the protected maintenance endpoint. Email stays disabled unless `EMAIL_DELIVERY_ENABLED=true`, `RESEND_API_KEY` and verified `EMAIL_FROM` are configured. Never enable real bulk delivery during development. Configure Resend delivery webhooks at `/api/bellix/email-webhook` with `RESEND_WEBHOOK_SECRET`; provider acceptance and confirmed delivery are separate states.

Schedule a server job every 5 minutes to POST to `https://www.bellix.us/api/bellix/cron` using `Authorization: Bearer BELLIX_WORKER_SECRET`. Store the secret in the scheduler's secret manager, not URL parameters. Supabase Cron + pg_net/Vault or an external backend scheduler may invoke this endpoint. No cron job has been installed. Each run releases overdue jobs, suppresses stale reminders, generates deduplicated four-day/expiration/low-credit notices and claims up to 25 email deliveries with retry leases. Automatic-plan reminders describe upcoming renewal; cancelled mandates describe expiry.

## Contact and exports

The existing `/contact` form POSTs to `/api/contact`, which validates, rate-limits and persists independently of email. `/admin/contact` lists records with filters and pagination and can update status/internal notes with a mandatory reason. There is no fake reply-send button. Download Excel exports the current visible page/filter, labelled as such; it does not silently claim to export the entire database.

## Verification and limits

Local verification completed on 2026-11-18: 17 embedded PostgreSQL integration tests passed; 5 Python backend boundary tests passed using the backend `.venv`; Next.js production build passed; standalone TypeScript check passed; focused ESLint for account/admin/billing server and routes passed. Browser checked `/admin` as unauthenticated: login form rendered, no dashboard records visible, and 390px viewport had no horizontal overflow. Authenticated dashboard/export and live contact persistence could not be exercised without configured Supabase credentials. These results do not certify live Razorpay, Supabase RLS deployment, email or cron operation.

Run:

```powershell
node scripts/check-billing-setup.mjs
node scripts/test-billing.mjs
npx.cmd tsc --noEmit
npm.cmd run build
```

From `../watermark-backend` run `.\.venv\Scripts\python.exe -m unittest test_billing_access -v`. The SQL suite uses embedded PostgreSQL with an Auth shim, not the production Supabase project. Actual concurrent production requests, gateway network/signature flows, email callbacks and cron delivery still need staging verification. Keep all publication disabled until those pass.

The existing processing service owns actual temporary media files; this change does not introduce a public Storage bucket or give admins private-media access. Review the service's retention/cleanup configuration separately before publishing privacy/retention promises. Policy routes are visibly marked drafts and noindex; business identity, support details, refund rules, retention, jurisdiction and delivery commitments require owner review.

## Deployment and rollback

Deploy schema changes to staging, set server/browser environment values, bootstrap the owner, configure test plans/webhooks, then test end-to-end. Deploy the Next.js app and Python service together because processing requires the worker endpoints. Build from the nested `logo-ai-remover-main` directory and confirm the resulting API routes remain local rather than being rewritten to Python. Deploy production only after reviewing policies, limits and credentials. This work has not deployed anything.

For rollback, first disable plan purchases and new recurring mandates. Cancel/stop existing provider mandates through confirmed provider operations as appropriate; disabling a checkout button does not stop recurring charges. Restore the previously deployed application only if compatible with the billing schema. Keep webhook ingestion and history available for reconciliation. Do not drop billing tables, grants, audit records or provider identifiers. Use database backup/point-in-time recovery only with a reviewed financial reconciliation plan.

## Implementation file map

- Admin login/UI: `src/components/account/AdminLogin.tsx`, `AdminPanel.tsx`, `admin.css`; `src/app/admin/layout.tsx`; `src/app/api/admin/login/route.ts`.
- Account, checkout and billing: `src/components/account/AccountPanel.tsx`, `AuthSessionSync.tsx`, `PricingPanel.tsx`, `CheckoutPanel.tsx`, `RecurringBilling.tsx`; `src/app/checkout/page.tsx`, `src/app/payment/status/page.tsx`.
- Trusted operations: `src/lib/server/bellix-api.ts`, `bellix.ts`, `razorpay.ts`, `recurring.ts`, `webhook-signatures.ts`; `src/app/api/payments/*/route.ts`, `src/app/api/subscriptions/create/route.ts`; `next.config.mjs`.
- Policies: `src/components/account/PolicyDraft.tsx`, `src/app/{privacy-policy,terms-and-conditions,refund-policy,delivery-policy}/page.tsx`.
- Database/setup/checks: migrations listed above, `.env.billing.example`, `scripts/bootstrap-superadmin.mjs`, `scripts/check-billing-setup.mjs`, `scripts/test-billing.mjs`.
- Existing processing integration reused: `../watermark-backend/billing_access.py`, `main.py`, `app.py`, `pdf_api.py`, `test_billing_access.py`; browser integration in `src/lib/account-processing.ts` and tool routes.
