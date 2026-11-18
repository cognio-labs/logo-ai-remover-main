"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { accountApi, accountFetch } from "./AccountPanel";
type CheckoutPlan = {
  id: string;
  name: string;
  description: string;
  kind: string;
  validity_days: number;
  plan_prices: { amount: number; currency: string; interval: string };
  recurring: { total_count: number } | null;
  plan_tool_limits: { units: number; tools: { slug: string; name: string } }[];
};
type PaymentView = { id: string; status: string; currency?: string; amount: number };
type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
};
export function CheckoutPanel({ planId }: { planId?: string }) {
  const [plan, setPlan] = useState<CheckoutPlan | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [automatic, setAutomatic] = useState(false);
  useEffect(() => {
    accountApi("plans")
      .then((d) => {
        const selected = d.rows.find((p: CheckoutPlan) => p.id === planId);
        if (!selected) throw new Error("Choose an available plan from pricing.");
        setPlan(selected);
      })
      .catch((e) => setError(e.message));
  }, [planId]);
  async function pay() {
    setBusy(true);
    setError("");
    try {
      if (!plan) throw new Error("Choose a published plan first.");
      await accountApi("me");
      if (automatic) {
        const key = `bellix-recurring-${plan.id}`;
        const requestKey = sessionStorage.getItem(key) || crypto.randomUUID();
        sessionStorage.setItem(key, requestKey);
        const contract = await accountApi("subscriptions/create", {
          plan_id: plan.id,
          request_key: requestKey,
        });
        const Constructor = (window as RazorpayWindow).Razorpay;
        if (!Constructor) throw new Error("Payment window is loading. Please retry.");
        new Constructor({
          key: contract.key_id,
          subscription_id: contract.subscription_id,
          name: "Bellix",
          handler: async (result: Record<string, string>) => {
            try {
              await accountApi("subscriptions/verify", {
                contract_id: contract.id,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
              });
              sessionStorage.removeItem(key);
            } finally {
              location.assign(`/payment/status?contract=${contract.id}`);
            }
          },
          modal: {
            ondismiss: () => {
              setBusy(false);
              location.assign(`/payment/status?contract=${contract.id}`);
            },
          },
        }).open();
        return;
      }
      const key = `bellix-checkout-${plan.id}`;
      const requestKey = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, requestKey);
      const response = await accountFetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, request_key: requestKey }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error);
      const Constructor = (window as RazorpayWindow).Razorpay;
      if (!Constructor) throw new Error("Payment window is loading. Please retry.");
      new Constructor({
        key: order.key_id,
        order_id: order.provider_order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Bellix",
        handler: async (result: Record<string, string>) => {
          try {
            const verification = await accountFetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: order.id,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
              }),
            });
            if (verification.ok) sessionStorage.removeItem(key);
          } finally {
            location.assign(`/payment/status?order=${order.id}`);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            location.assign(`/payment/status?order=${order.id}`);
          },
        },
      }).open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <p className="text-sm uppercase tracking-widest">Bellix checkout</p>
      <h1 className="text-4xl font-semibold">Review your purchase</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {plan && (
        <article className="rounded-3xl border bg-white p-8 space-y-5">
          <h2 className="text-2xl">{plan.name}</h2>
          <p>{plan.description}</p>
          <p className="text-3xl font-semibold">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: plan.plan_prices.currency,
            }).format(plan.plan_prices.amount / 100)}
          </p>
          <p>
            {automatic ? "Automatic renewal" : "Manual renewal"} ·{" "}
            {plan.kind === "topup"
              ? `${plan.validity_days} day top-up validity`
              : plan.plan_prices.interval}{" "}
            · No rollover
          </p>
          {plan.recurring && (
            <label className="flex items-start gap-3 border rounded-xl p-4">
              <input
                className="mt-1"
                type="checkbox"
                checked={automatic}
                onChange={(e) => setAutomatic(e.target.checked)}
              />
              <span>
                Enable automatic {plan.plan_prices.interval} billing for{" "}
                {plan.recurring.total_count} cycles. Razorpay will ask you to authorize recurring
                payments. You can request cancellation from Billing.
              </span>
            </label>
          )}
          {plan.plan_tool_limits.map((l) => (
            <p key={l.tools.slug}>
              {l.tools.name}: {l.units} credits
            </p>
          ))}
          <p className="text-sm">
            An active paid plan purchase starts at the current period's end. Trial-to-paid access
            starts after payment verification. Top-ups follow their own validity and active-plan
            requirement.
          </p>
          <button
            className="rounded-xl bg-[#063b27] text-white px-6 py-4"
            disabled={busy}
            onClick={() => void pay()}
          >
            {busy ? "Opening secure checkout…" : "Pay with Razorpay"}
          </button>
        </article>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          ["/pricing", "Pricing"],
          ["/account", "Sign in"],
          ["/terms-and-conditions", "Terms"],
          ["/refund-policy", "Refund policy"],
          ["/delivery-policy", "Delivery policy"],
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
export function PaymentStatusPanel({
  orderId,
  contractId,
}: {
  orderId?: string;
  contractId?: string;
}) {
  const [order, setOrder] = useState<PaymentView | null>(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      if (!orderId && !contractId)
        throw new Error("No order selected. Open billing to view your purchases.");
      if (contractId) {
        setOrder(
          await accountApi(`subscription-status?contract=${encodeURIComponent(contractId)}`),
        );
        return;
      }
      setOrder(await accountApi(`payment-status?order=${encodeURIComponent(orderId!)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [orderId]);
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 space-y-6">
      <h1 className="text-4xl font-semibold">Payment status</h1>
      {error && <p role="alert">{error}</p>}
      {order && (
        <div className="bg-white border rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl">
            {order.status === "paid"
              ? "Payment confirmed"
              : order.status === "refunded"
                ? "Refund recorded"
                : order.status === "failed"
                  ? "Payment failed"
                  : "Awaiting payment confirmation"}
          </h2>
          <p>Reference: {order.id}</p>
          <p>
            {order.currency
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: order.currency,
                }).format(order.amount / 100)
              : `Subscription: ${order.status}. Authorization alone does not activate credits; see Billing for verified paid periods.`}
          </p>
          <p>
            Access and credits are granted only after the server verifies the payment. Closing
            checkout can leave an unpaid order pending.
          </p>
        </div>
      )}
      <button className="rounded-lg border px-4 py-3" onClick={() => void load()}>
        Refresh status
      </button>{" "}
      <Link href="/account/billing">Open billing</Link>
    </section>
  );
}
