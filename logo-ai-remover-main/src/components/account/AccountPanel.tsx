"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RecurringBilling } from "./RecurringBilling";

export async function accountFetch(path: string, init: RequestInit = {}) {
  try {
    const sessionRes = await supabase?.auth?.getSession?.();
    const session = sessionRes?.data?.session;
    return fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    });
  } catch {
    return fetch(path, init);
  }
}
export async function accountApi(path: string, payload?: unknown) {
  const response = await accountFetch(
    `/api/bellix/${path}`,
    payload === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
  );
  const data = await response.json().catch(() => null);
  if (!data)
    throw new Error(
      `Account service unavailable (HTTP ${response.status}). Please check server configuration and try again.`,
    );
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
const links = ["", "billing", "usage", "notifications", "payments", "jobs", "ledger"];
export function AccountPanel({ section = "" }: { section?: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [user, setUser] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [count, setCount] = useState(0),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const me = await accountApi("me");
      setUser(me.user);
      if (section) {
        const data = await accountApi(`account/${section}?page=${page}`);
        setRows(data.rows);
        setCount(data.count);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [section, page]);
  useEffect(() => {
    void load();
    if (!supabase?.auth?.onAuthStateChange) return;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session)
          void accountApi("session", { access_token: session.access_token })
            .then(() => load())
            .catch(() => {});
      });
      return () => data?.subscription?.unsubscribe?.();
    } catch {
      return;
    }
  }, [load]);
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email")),
        password = String(form.get("password"));
      const signup =
        (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "signup";
      const { data, error: authError } = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (data.session) {
        await accountApi("session", { access_token: data.session.access_token });
        location.assign("/account");
      } else setNotice("Check your email to verify the account, then sign in.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 space-y-6">
      <h1 className="text-3xl">Your Bellix account</h1>
      <nav className="flex flex-wrap gap-4">
        {links.map((key) => (
          <Link key={key} href={`/account${key ? "/" + key : ""}`}>
            {key || "Account"}
          </Link>
        ))}
        <Link href="/pricing">Plans & top-ups</Link>
      </nav>
      {loading && <p role="status">Loading your account…</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!user && !loading && (
        <form onSubmit={authenticate} className="max-w-md space-y-4">
          <label>
            Email
            <input
              className="block w-full border rounded p-3"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              className="block w-full border rounded p-3"
              name="password"
              type="password"
              minLength={8}
              autoComplete="current-password"
              required
            />
          </label>
          <div className="flex gap-4">
            <button disabled={busy} value="login" className="rounded bg-[#10241e] text-white p-3">
              Sign in
            </button>
            <button disabled={busy} value="signup" className="rounded border p-3">
              Create account
            </button>
          </div>
          <p>
            Verified accounts receive one trial: 2 background removals, 3 Gemini image cleanups and
            2 video cleanups, with separate balances. Trial duration follows the settings at
            verification.
          </p>
        </form>
      )}
      {user && (
        <>
          <p>
            Signed in as {String(user.email)}. Trial ends:{" "}
            {user.trial_ends_at
              ? new Date(String(user.trial_ends_at)).toLocaleString()
              : "Not granted"}
            .
          </p>
          <button
            className="border rounded p-2"
            onClick={async () => {
              await accountApi("logout", {});
              await supabase.auth.signOut();
              location.assign("/account");
            }}
          >
            Sign out
          </button>
          {section && (
            <>
              {section === "billing" && <RecurringBilling />}
              <RecordTable rows={rows} />
              <Pagination page={page} count={count} change={setPage} />
              {section === "billing" &&
                rows.map(
                  (row) =>
                    row.status === "active" && (
                      <button
                        key={String(row.id)}
                        className="border rounded p-2"
                        onClick={async () => {
                          try {
                            await accountApi("cancel", { subscription_id: row.id });
                            await load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Stop renewal for {String(row.id)} (access remains until period end)
                      </button>
                    ),
                )}
              {section === "notifications" &&
                rows
                  .filter((row) => !row.read_at)
                  .map((row) => (
                    <button
                      key={String(row.id)}
                      onClick={async () => {
                        await accountApi("notifications/read", { id: row.id });
                        await load();
                      }}
                    >
                      Mark notice read: {String(row.body)}
                    </button>
                  ))}
            </>
          )}
          {!section && (
            <p>
              Use Usage to see each tool's separate grants and expiry, Billing for paid periods, and
              Notifications for account notices. Local browser processing outcomes are
              client-reported and are not proof of a secured paid algorithm.
            </p>
          )}
        </>
      )}
    </section>
  );
}
export function Pagination({
  page,
  count,
  change,
}: {
  page: number;
  count: number;
  change: (page: number) => void;
}) {
  return (
    <div className="flex gap-4 items-center">
      <button disabled={page === 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} · {count} records
      </span>
      <button disabled={page * 25 >= count} onClick={() => change(page + 1)}>
        Next
      </button>
    </div>
  );
}
export function RecordTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p>No records found.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto border rounded-xl bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {columns.map((key) => (
              <th className="p-3 border-b" key={key}>
                {key.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id || i)}>
              {columns.map((key) => (
                <td className="p-3 border-b max-w-sm whitespace-pre-wrap break-words" key={key}>
                  {typeof row[key] === "object"
                    ? JSON.stringify(row[key], null, 2)
                    : String(row[key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
