import { ApiError, database, rpc } from "./bellix";
import { gatewayConfig, razorpay } from "./razorpay";
export async function validateProviderPlan(
  id: string,
  snapshot: { price: { amount: number; currency: string; interval: string } },
) {
  if (!/^plan_[A-Za-z0-9]+$/.test(id)) throw new ApiError(400, "Invalid gateway plan");
  const plan = await razorpay(`plans/${id}`);
  if (
    plan.item?.amount !== snapshot.price.amount ||
    plan.item?.currency !== snapshot.price.currency ||
    plan.interval !== 1 ||
    plan.period !== (snapshot.price.interval === "weekly" ? "weekly" : "monthly")
  )
    throw new ApiError(409, "Gateway plan does not match published pricing");
}
export async function createRecurring(userId: string, planId: string, requestKey: string) {
  const c = await rpc("create_recurring", {
    p_user: userId,
    p_plan: planId,
    p_request: requestKey,
    p_environment: gatewayConfig().mode,
  });
  if (c.provider_subscription_id)
    return { id: c.id, subscription_id: c.provider_subscription_id, key_id: gatewayConfig().id };
  await validateProviderPlan(c.provider_plan_id, c.snapshot);
  const { data: claimed, error } = await database()
    .from("recurring_contracts")
    .update({ status: "creation_unknown" })
    .eq("id", c.id)
    .eq("status", "creating")
    .select("id")
    .maybeSingle();
  if (error || !claimed)
    throw new ApiError(
      409,
      "Subscription creation requires reconciliation; do not create another mandate",
    );
  const starting = c.scheduled_start ? Math.floor(new Date(c.scheduled_start).getTime() / 1000) : 0;
  const provider = await razorpay("subscriptions", "POST", {
    plan_id: c.provider_plan_id,
    total_count: c.total_count,
    quantity: 1,
    customer_notify: true,
    notes: { bellix_contract: c.id },
    ...(starting > Date.now() / 1000 + 60 ? { start_at: starting } : {}),
  });
  const { error: saved } = await database()
    .from("recurring_contracts")
    .update({ provider_subscription_id: provider.id, status: provider.status })
    .eq("id", c.id)
    .eq("status", "creation_unknown");
  if (saved) throw new ApiError(503, "Subscription reconciliation required");
  return { id: c.id, subscription_id: provider.id, key_id: gatewayConfig().id };
}
export async function recurringPayment(
  payment: {
    id: string;
    invoice_id?: string;
    order_id: string;
    amount: number;
    currency: string;
    captured: boolean;
    status: string;
  },
  eventId?: string,
) {
  if (!payment.invoice_id) return null;
  const invoice = await razorpay(`invoices/${payment.invoice_id}`);
  if (!invoice.subscription_id) return null;
  await syncRecurring(invoice.subscription_id);
  const { data: contract } = await database()
    .from("recurring_contracts")
    .select("*")
    .eq("provider_subscription_id", invoice.subscription_id)
    .single();
  if (!contract) throw new ApiError(409, "Subscription reconciliation required");
  const provider = await razorpay(`subscriptions/${invoice.subscription_id}`);
  if (
    provider.plan_id !== contract.provider_plan_id ||
    contract.environment !== gatewayConfig().mode ||
    invoice.status !== "paid" ||
    invoice.payment_id !== payment.id ||
    invoice.order_id !== payment.order_id ||
    invoice.amount_paid !== payment.amount ||
    invoice.currency !== payment.currency ||
    !payment.captured ||
    !["captured", "refunded"].includes(payment.status) ||
    !Number.isSafeInteger(invoice.billing_start) ||
    !Number.isSafeInteger(invoice.billing_end)
  )
    throw new ApiError(409, "Subscription payment verification failed");
  const refunds = await razorpay(`payments/${payment.id}/refunds?count=100`);
  if (refunds.items?.length >= 100)
    throw new ApiError(409, "Refund pagination reconciliation required");
  const result = await rpc("fulfill_recurring", {
    p_contract: contract.id,
    p_provider_order: payment.order_id,
    p_payment: payment.id,
    p_amount: payment.amount,
    p_currency: payment.currency,
    p_environment: gatewayConfig().mode,
    p_start: new Date(invoice.billing_start * 1000).toISOString(),
    p_end: new Date(invoice.billing_end * 1000).toISOString(),
    p_event: eventId || null,
    p_refunds: refunds.items || [],
  });
  await syncRecurring(invoice.subscription_id);
  return result;
}
export async function syncRecurring(id: string) {
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new ApiError(400, "Invalid subscription reference");
  const provider = await razorpay(`subscriptions/${id}`);
  // Recover an ambiguous creation only from a provider-fetched contract reference.
  if (provider.notes?.bellix_contract && /^[0-9a-f-]{36}$/i.test(provider.notes.bellix_contract)) {
    const { data: pending } = await database()
      .from("recurring_contracts")
      .select("*")
      .eq("id", provider.notes.bellix_contract)
      .eq("status", "creation_unknown")
      .eq("environment", gatewayConfig().mode)
      .maybeSingle();
    if (
      pending &&
      pending.provider_plan_id === provider.plan_id &&
      pending.total_count === provider.total_count &&
      provider.quantity === 1
    ) {
      await database()
        .from("recurring_contracts")
        .update({ provider_subscription_id: id, status: provider.status })
        .eq("id", pending.id)
        .eq("status", "creation_unknown");
    }
  }
  const { data: c, error } = await database()
    .from("recurring_contracts")
    .update({ status: provider.status })
    .eq("provider_subscription_id", id)
    .eq("environment", gatewayConfig().mode)
    .select("id")
    .maybeSingle();
  if (error || !c) throw new ApiError(409, "Subscription reconciliation required");
  if (["cancelled", "completed", "expired"].includes(provider.status))
    await database()
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("recurring_contract_id", c.id)
      .eq("status", "active");
  return provider;
}
