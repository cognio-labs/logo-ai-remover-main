import { ApiError, database, rpc } from "./bellix";
export function gatewayConfig() {
  const id = process.env.RAZORPAY_KEY_ID,
    secret = process.env.RAZORPAY_KEY_SECRET;
  const mode = process.env.RAZORPAY_MODE || "test";
  if (!id || !secret || !["test", "live"].includes(mode) || !id.startsWith(`rzp_${mode}_`))
    throw new ApiError(503, "Payment gateway setup required");
  return { id, secret, mode };
}
export async function razorpay(path: string, method = "GET", payload?: unknown) {
  const c = gatewayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ApiError(502, "Gateway request failed");
  return response.json();
}
export async function verifyPayment(
  paymentId: string,
  orderId?: string,
  userId?: string,
  eventId?: string,
) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new ApiError(400, "Invalid payment reference");
  const payment = await razorpay(`payments/${paymentId}`);
  if (payment.invoice_id) {
    const { recurringPayment } = await import("./recurring");
    // Recurring checkout is verified through its owned contract, not a one-time order.
    if (orderId || userId)
      throw new ApiError(409, "Use subscription verification for recurring payments");
    const recurring = await recurringPayment(payment, eventId);
    if (recurring) return recurring;
  }
  const db = database();
  let { data: order } = await db
    .from("orders")
    .select("*")
    .eq("provider_order_id", payment.order_id)
    .single();
  const providerOrder = await razorpay(`orders/${payment.order_id}`);
  if (!order && providerOrder.receipt) {
    const { data: pending } = await db
      .from("orders")
      .select("*")
      .eq("id", providerOrder.receipt)
      .eq("status", "creation_unknown")
      .single();
    if (
      pending &&
      pending.amount === providerOrder.amount &&
      pending.currency === providerOrder.currency &&
      pending.environment === gatewayConfig().mode
    ) {
      const { data: restored } = await db
        .from("orders")
        .update({ provider_order_id: providerOrder.id, status: "pending" })
        .eq("id", pending.id)
        .eq("status", "creation_unknown")
        .select("*")
        .single();
      order = restored;
    }
  }
  if (
    !order ||
    (orderId && order.id !== orderId) ||
    (userId && order.user_id !== userId) ||
    !["captured", "refunded"].includes(payment.status) ||
    payment.captured !== true ||
    payment.amount !== order.amount ||
    payment.currency !== order.currency ||
    order.environment !== gatewayConfig().mode
  )
    throw new ApiError(409, "Payment is not verified as captured");
  if (
    providerOrder.receipt !== order.id ||
    providerOrder.amount !== order.amount ||
    providerOrder.currency !== order.currency ||
    providerOrder.status !== "paid"
  )
    throw new ApiError(409, "Order verification failed");
  // Capture and already-confirmed refunds are reconciled in one database transaction.
  const refunds = await razorpay(`payments/${paymentId}/refunds?count=100`);
  if (refunds.items?.length >= 100)
    throw new ApiError(409, "Refund pagination reconciliation required");
  const result = await rpc("fulfill_with_refunds", {
    p_provider_order: payment.order_id,
    p_payment: payment.id,
    p_amount: payment.amount,
    p_currency: payment.currency,
    p_environment: gatewayConfig().mode,
    p_event: eventId || null,
    p_refunds: refunds.items || [],
  });
  return result;
}
