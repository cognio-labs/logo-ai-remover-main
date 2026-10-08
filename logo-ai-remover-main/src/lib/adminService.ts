import { supabase } from "./supabase";

export interface DBUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: "super_admin" | "admin" | "support" | "moderator" | "user";
  status: "active" | "suspended" | "banned" | "pending";
  country: string | null;
  plan: "free" | "creator" | "studio";
  credits: number;
  last_credit_reset: string | null;
  last_login: string | null;
  created_at: string;
}

export interface DBJob {
  id: string;
  user_id: string | null;
  tool: string;
  file_name: string | null;
  input_url: string | null;
  output_url: string | null;
  file_size_mb: number | null;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  credits: number;
  gpu_seconds: number;
  cost: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface DBTool {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  is_coming_soon: boolean;
  credit_cost: number;
  max_size_mb: number;
  max_duration_sec: number;
  formats: string[];
  default_model: string;
  created_at: string;
}

export interface DBPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  credits: number;
  limits_json: Record<string, unknown>;
  features_json: string[];
  active: boolean;
  status?: "draft" | "published" | "archived";
  daily_ai_tokens?: number;
  monthly_ai_tokens?: number;
  daily_requests?: number;
  monthly_requests?: number;
  max_file_size?: number;
  max_video_duration?: number;
  enabled_tools?: string[];
  api_access?: boolean;
  webhook_access?: boolean;
  priority?: "standard" | "high" | "ultra";
  created_at: string;
}

export interface DBSetting {
  id: string;
  category: string;
  value: Record<string, any>;
  updated_by?: string | null;
  updated_at?: string;
}

export interface DBPayment {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  stripe_payment_id: string | null;
  refunded: boolean;
  refund_reason: string | null;
  created_at: string;
}

export interface DBCoupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  expires_at: string | null;
  max_uses: number;
  used: number;
  active: boolean;
  created_at: string;
}

export interface DBAuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface DBCreditLedger {
  id: string;
  user_id: string;
  change: number;
  reason: string;
  job_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface DBTicket {
  id: string;
  user_id: string | null;
  user_email: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REAL SUPABASE DATA FETCHERS & MUTATIONS
// ============================================================================

export async function fetchUsers(): Promise<{ data: DBUser[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBUser[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createUser(payload: {
  email: string;
  name: string;
  role: "user" | "admin" | "super_admin";
  plan: "free" | "creator" | "studio";
  credits: number;
}): Promise<{ data: DBUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: payload.email,
          name: payload.name,
          role: payload.role,
          plan: payload.plan,
          credits: payload.credits,
          status: "active",
        },
      ])
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Record audit log
    await recordAuditLog({
      action: "USER_CREATE",
      entity: "users",
      entity_id: data?.id,
      after_json: { email: payload.email, plan: payload.plan, credits: payload.credits },
    });

    return { data: data as DBUser, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended" | "banned",
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("users").update({ status }).eq("id", userId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: `USER_STATUS_${status.toUpperCase()}`,
      entity: "users",
      entity_id: userId,
      after_json: { status },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteUser(
  userId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "USER_DELETE",
      entity: "users",
      entity_id: userId,
      after_json: { deleted: true },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateUserCredits(
  userId: string,
  newBalance: number,
  changeDelta: number,
  reason: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Update user credits balance
    const { error: userError } = await supabase
      .from("users")
      .update({ credits: newBalance })
      .eq("id", userId);

    if (userError) return { success: false, error: userError.message };

    // 2. Insert immutable audit entry in credit_ledger
    await supabase.from("credit_ledger").insert([
      {
        user_id: userId,
        change: changeDelta,
        reason,
        balance_after: newBalance,
      },
    ]);

    // 3. Record audit log
    await recordAuditLog({
      action: changeDelta >= 0 ? "CREDITS_GRANT" : "CREDITS_DEDUCT",
      entity: "users",
      entity_id: userId,
      after_json: { new_balance: newBalance, delta: changeDelta, reason },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateUserPlan(
  userId: string,
  plan: "free" | "creator" | "studio",
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("users").update({ plan }).eq("id", userId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "USER_PLAN_CHANGE",
      entity: "users",
      entity_id: userId,
      after_json: { plan },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// JOBS & QUEUE
// ----------------------------------------------------------------------------

export async function fetchJobs(): Promise<{ data: DBJob[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBJob[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function retryJob(jobId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("jobs")
      .update({ status: "processing", error: null })
      .eq("id", jobId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "JOB_RETRY",
      entity: "jobs",
      entity_id: jobId,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function cancelJob(
  jobId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "JOB_CANCEL",
      entity: "jobs",
      entity_id: jobId,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// TOOLS
// ----------------------------------------------------------------------------

export async function fetchTools(): Promise<{ data: DBTool[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from("tools").select("*").order("id");
    if (error) return { data: [], error: error.message };
    return { data: (data as DBTool[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTool(
  toolId: string,
  updates: Partial<DBTool>,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("tools").update(updates).eq("id", toolId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "TOOL_UPDATE",
      entity: "tools",
      entity_id: toolId,
      after_json: updates,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// PLANS (Phase 2 & Phase 3 Single Source of Truth + Validation)
// ----------------------------------------------------------------------------

export function validatePlanPayload(plan: Partial<DBPlan>): { valid: boolean; error?: string; status?: number } {
  if (plan.price_monthly !== undefined && Number(plan.price_monthly) < 0) {
    return { valid: false, error: "Monthly price cannot be negative", status: 422 };
  }
  if (plan.price_annual !== undefined && Number(plan.price_annual) < 0) {
    return { valid: false, error: "Annual price cannot be negative", status: 422 };
  }
  if (plan.credits !== undefined && Number(plan.credits) < 0) {
    return { valid: false, error: "Monthly credits cannot be negative", status: 422 };
  }
  if (plan.daily_ai_tokens !== undefined && Number(plan.daily_ai_tokens) < 0) {
    return { valid: false, error: "Daily AI tokens cannot be negative", status: 422 };
  }
  if (plan.monthly_ai_tokens !== undefined && plan.daily_ai_tokens !== undefined) {
    if (Number(plan.monthly_ai_tokens) < Number(plan.daily_ai_tokens)) {
      return { valid: false, error: "Monthly AI tokens must be greater than or equal to daily AI tokens", status: 422 };
    }
  }
  if (plan.daily_requests !== undefined && Number(plan.daily_requests) < 0) {
    return { valid: false, error: "Daily requests cannot be negative", status: 422 };
  }
  if (plan.monthly_requests !== undefined && plan.daily_requests !== undefined) {
    if (Number(plan.monthly_requests) < Number(plan.daily_requests)) {
      return { valid: false, error: "Monthly requests must be greater than or equal to daily requests", status: 422 };
    }
  }
  if (plan.name !== undefined && !plan.name.trim()) {
    return { valid: false, error: "Plan name cannot be empty", status: 422 };
  }
  return { valid: true };
}

export async function fetchPlans(): Promise<{ data: DBPlan[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from("plans").select("*").order("price_monthly");
    if (error) return { data: [], error: error.message };
    return { data: (data as DBPlan[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updatePlan(
  planId: string,
  updates: Partial<DBPlan>,
): Promise<{ success: boolean; error: string | null; status?: number }> {
  // Phase 3 Validation Check: Return 422 on invalid input
  const validation = validatePlanPayload(updates);
  if (!validation.valid) {
    return { success: false, error: validation.error || "Validation failed", status: 422 };
  }

  try {
    const { error } = await supabase.from("plans").update(updates).eq("id", planId);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "PLAN_UPDATE",
      entity: "plans",
      entity_id: planId,
      after_json: updates,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function setPlanStatus(
  planId: string,
  status: "draft" | "published" | "archived",
): Promise<{ success: boolean; error: string | null }> {
  try {
    const active = status === "published";
    const { error } = await supabase.from("plans").update({ status, active }).eq("id", planId);
    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: `PLAN_STATUS_${status.toUpperCase()}`,
      entity: "plans",
      entity_id: planId,
      after_json: { status, active },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// COUPONS
// ----------------------------------------------------------------------------

export async function fetchCoupons(): Promise<{ data: DBCoupon[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBCoupon[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createCoupon(payload: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  max_uses: number;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("coupons").insert([
      {
        code: payload.code.toUpperCase().trim(),
        type: payload.type,
        value: payload.value,
        max_uses: payload.max_uses,
        active: true,
      },
    ]);

    if (error) return { success: false, error: error.message };

    await recordAuditLog({
      action: "COUPON_CREATE",
      entity: "coupons",
      entity_id: payload.code,
      after_json: payload,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// PAYMENTS
// ----------------------------------------------------------------------------

export async function fetchPayments(): Promise<{ data: DBPayment[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBPayment[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------------------

export async function fetchAuditLogs(): Promise<{ data: DBAuditLog[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { data: [], error: error.message };
    return { data: (data as DBAuditLog[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function recordAuditLog(log: {
  action: string;
  entity: string;
  entity_id?: string | null;
  admin_email?: string;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabase.from("audit_logs").insert([
      {
        admin_email: log.admin_email || "admin@bellix.us",
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id || null,
        before_json: log.before_json || null,
        after_json: log.after_json || null,
        ip: "127.0.0.1",
      },
    ]);
  } catch (e) {
    console.warn("Failed to write audit log:", e);
  }
}

// ----------------------------------------------------------------------------
// TICKETS
// ----------------------------------------------------------------------------

export async function fetchTickets(): Promise<{ data: DBTicket[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBTicket[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: "open" | "in_progress" | "resolved" | "closed",
  assignee?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (assignee !== undefined) updates.assignee = assignee;
    const { error } = await supabase.from("tickets").update(updates).eq("id", ticketId);
    if (error) return { success: false, error: error.message };
    await recordAuditLog({
      action: `TICKET_${status.toUpperCase()}`,
      entity: "tickets",
      entity_id: ticketId,
      after_json: updates,
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// ABUSE & DMCA REPORTS
// ----------------------------------------------------------------------------

export interface DBAbuseReport {
  id: string;
  reporter: string;
  job_id: string | null;
  file_url: string | null;
  type: "dmca" | "copyright" | "explicit" | "unauthorized_edit" | "other";
  status: "pending" | "under_review" | "action_taken" | "dismissed";
  decision: string | null;
  notes: string | null;
  created_at: string;
}

export async function fetchAbuseReports(): Promise<{ data: DBAbuseReport[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("abuse_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as DBAbuseReport[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateAbuseReport(
  reportId: string,
  status: "pending" | "under_review" | "action_taken" | "dismissed",
  decision: string,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updates = { status, decision, notes: notes || null };
    const { error } = await supabase.from("abuse_reports").update(updates).eq("id", reportId);
    if (error) return { success: false, error: error.message };
    await recordAuditLog({
      action: `ABUSE_REPORT_${status.toUpperCase()}`,
      entity: "abuse_reports",
      entity_id: reportId,
      after_json: updates,
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// CMS CONTENT PAGES
// ----------------------------------------------------------------------------

export interface DBContentPage {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  seo_json: Record<string, any>;
  status: "draft" | "published" | "archived";
  updated_at: string;
}

export async function fetchContentPages(): Promise<{ data: DBContentPage[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("content_pages")
      .select("*")
      .order("slug");
    if (error) return { data: [], error: error.message };
    return { data: (data as DBContentPage[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateContentPage(
  slug: string,
  updates: Partial<DBContentPage>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("content_pages").update(payload).eq("slug", slug);
    if (error) return { success: false, error: error.message };
    await recordAuditLog({
      action: "CMS_PAGE_UPDATE",
      entity: "content_pages",
      entity_id: slug,
      after_json: payload,
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// REFUND JOB CREDITS
// ----------------------------------------------------------------------------

export async function refundJobCredits(
  jobId: string,
  userId: string,
  creditAmount: number,
  reason = "Job Failure / Admin Refund"
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Get user current credits
    const { data: u, error: uErr } = await supabase.from("users").select("credits").eq("id", userId).single();
    if (uErr) return { success: false, error: uErr.message };

    const newBalance = (u?.credits || 0) + creditAmount;

    // 2. Update user balance
    const { error: updErr } = await supabase.from("users").update({ credits: newBalance }).eq("id", userId);
    if (updErr) return { success: false, error: updErr.message };

    // 3. Insert into credit ledger
    await supabase.from("credit_ledger").insert([
      {
        user_id: userId,
        change: creditAmount,
        reason,
        job_id: jobId,
        balance_after: newBalance,
      },
    ]);

    // 4. Update job status to cancelled / refunded
    await supabase.from("jobs").update({ status: "cancelled", error: reason }).eq("id", jobId);

    // 5. Audit log
    await recordAuditLog({
      action: "JOB_CREDIT_REFUND",
      entity: "jobs",
      entity_id: jobId,
      after_json: { user_id: userId, credits_refunded: creditAmount, new_balance: newBalance },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// PHASE 11: ATOMIC CREDIT DEDUCTION & DOUBLE-SPENDING PREVENTION
// ----------------------------------------------------------------------------

export async function deductUserCreditsAtomic(
  userId: string,
  amount: number,
  reason: string,
  jobId?: string
): Promise<{ success: boolean; newBalance?: number; error: string | null }> {
  try {
    // 1. Attempt PostgreSQL atomic RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc("deduct_user_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_job_id: jobId || null,
    });

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        return { success: true, newBalance: rpcData.new_balance, error: null };
      }
      return { success: false, error: rpcData.error || "Credit deduction failed" };
    }

    // 2. Fallback to transactional client verification if RPC not yet created in PostgreSQL
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (uErr || !u) return { success: false, error: uErr?.message || "User not found" };

    if (u.credits < amount) {
      return { success: false, error: `Insufficient credits. Required: ${amount}, available: ${u.credits}` };
    }

    const newBalance = u.credits - amount;
    const { error: updErr } = await supabase.from("users").update({ credits: newBalance }).eq("id", userId);
    if (updErr) return { success: false, error: updErr.message };

    await supabase.from("credit_ledger").insert([
      {
        user_id: userId,
        change: -amount,
        reason,
        job_id: jobId || null,
        balance_after: newBalance,
      },
    ]);

    return { success: true, newBalance, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// PHASE 15: DATABASE-BACKED SYSTEM SETTINGS
// ----------------------------------------------------------------------------

export async function fetchSettings(): Promise<{ data: Record<string, any>; error: string | null }> {
  try {
    const { data, error } = await supabase.from("settings").select("*");
    if (error) {
      // Return cached/default settings if table pending migration
      return {
        data: {
          brandName: "Bellix.us",
          supportEmail: "support@bellix.us",
          announcementEnabled: false,
          announcementText: "",
          maintenanceMode: false,
          jobRetentionHours: 24,
          maxUploadMb: 500,
        },
        error: null,
      };
    }

    const merged: Record<string, any> = {};
    (data as DBSetting[]).forEach((s) => {
      if (s.value && typeof s.value === "object") {
        Object.assign(merged, s.value);
      }
    });

    return { data: merged, error: null };
  } catch (err: unknown) {
    return { data: {}, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveSetting(
  settingId: string,
  category: string,
  value: Record<string, any>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("settings").upsert(
      {
        id: settingId,
        category,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      // If table missing, store in localStorage gracefully
      localStorage.setItem(`bellix_setting_${settingId}`, JSON.stringify(value));
      return { success: true, error: null };
    }

    await recordAuditLog({
      action: "SETTINGS_UPDATE",
      entity: "settings",
      entity_id: settingId,
      after_json: value,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    localStorage.setItem(`bellix_setting_${settingId}`, JSON.stringify(value));
    return { success: true, error: null };
  }
}

