"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { accountApi } from "./AccountPanel";
type Plan = {
  id: string;
  name: string;
  description: string;
  kind: string;
  validity_days: number;
  requires_active_plan: boolean;
  plan_prices: { amount: number; currency: string; interval: string };
  plan_tool_limits: Record<string, unknown>[];
};
export function PricingPanel() {
  const [plans, setPlans] = useState<Plan[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    accountApi("plans")
      .then((data) => setPlans(data.rows))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 space-y-6">
      <h1 className="text-4xl">Bellix plans and credits</h1>
      <p>
        One trial per verified account: 2 background removals, 3 Gemini image cleanups and 2 video
        cleanups. Separate balances; duration is set when your account is verified.{" "}
        <Link href="/account">Sign in or create an account</Link>.
      </p>
      <p>
        Manual renewal is available for published plans. Automatic weekly/monthly billing is offered
        only when an owner-configured Razorpay recurring plan is available at checkout. Rollover is
        off. Purchases during an active paid period start at its end; a trial-to-paid purchase
        starts immediately after verified payment.
      </p>
      {loading && <p role="status">Loading published prices…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !plans.length && !error && (
        <p>No paid plans are published yet. Prices and allowances are awaiting configuration.</p>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((p) => (
          <article key={p.id} className="border bg-white rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl">{p.name}</h2>
            <p>{p.description}</p>
            <p>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: p.plan_prices.currency,
              }).format(p.plan_prices.amount / 100)}{" "}
              · {p.kind === "topup" ? `${p.validity_days} days` : p.plan_prices.interval}
            </p>
            <p>
              Top-up requires active base plan: {p.requires_active_plan ? "Yes" : "No"}. Each grant
              has its own expiry.
            </p>
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(p.plan_tool_limits, null, 2)}
            </pre>
            <button
              className="bg-[#10241e] text-white rounded-xl p-3"
              onClick={() => location.assign(`/checkout?plan=${p.id}`)}
            >
              Review plan & checkout
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
