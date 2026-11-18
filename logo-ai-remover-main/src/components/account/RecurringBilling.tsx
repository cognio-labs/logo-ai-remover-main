"use client";
import { useEffect, useState } from "react";
import { accountApi } from "./AccountPanel";
export function RecurringBilling() {
  const [contracts, setContracts] = useState<
      { id: string; status: string; cancel_at_period_end: boolean }[]
    >([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      setContracts((await accountApi("account/contracts")).rows);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="space-y-4">
      <h2 className="text-xl">Automatic billing</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!contracts.length && !error && <p>No automatic billing mandates found.</p>}
      {contracts.map((c) => (
        <article className="bg-white border rounded-xl p-5 space-y-3" key={c.id}>
          <p>
            {c.status} · {c.cancel_at_period_end ? "Cancellation scheduled" : "Automatic renewal"}
          </p>
          <p>Contract: {c.id}</p>
          {!["cancelled", "completed", "expired", "creating", "creation_unknown"].includes(
            c.status,
          ) &&
            !c.cancel_at_period_end && (
              <button
                className="border rounded p-3"
                onClick={async () => {
                  try {
                    const result = await accountApi("subscriptions/cancel", { contract_id: c.id });
                    setNotice(result.notice);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Cancel automatic renewal at period end
              </button>
            )}
        </article>
      ))}
    </section>
  );
}
