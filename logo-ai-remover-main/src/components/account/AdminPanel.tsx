"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pagination, RecordTable } from "./AccountPanel";
import { Download, RefreshCw, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
async function accountApi(path: string, payload?: unknown) {
  const response = await fetch(
    `/api/bellix/${path}`,
    payload === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new Error(data?.error || "Admin service unavailable. Check server setup.");
  return data;
}
const labels: Record<string, string> = {
  contact: "Contact inbox",
  plans: "Plans & pricing",
  trial: "Free trial",
  jobs: "Processing jobs",
  settings: "Website settings",
  "audit-logs": "Admin activity",
  roles: "Team access",
  ledger: "Credit ledger",
};
export const adminSections = [
  "users",
  "contact",
  "plans",
  "trial",
  "subscriptions",
  "payments",
  "credits",
  "jobs",
  "notifications",
  "settings",
  "audit-logs",
  "tools",
  "ledger",
  "roles",
  "orders",
];
const templates: Record<string, { action: string; data: unknown }> = {
  contact: {
    action: "contact",
    data: { id: "PASTE_MESSAGE_UUID", status: "pending", internal_notes: "" },
  },
  users: { action: "user", data: { id: "PASTE_USER_UUID", status: "active" } },
  plans: {
    action: "plan",
    data: {
      name: "New draft plan",
      description: "",
      kind: "plan",
      amount: null,
      currency: "INR",
      interval: "weekly",
      limits: [],
    },
  },
  trial: {
    action: "trial",
    data: {
      days: 7,
      "background-remover": 2,
      "gemini-image-watermark-remover": 3,
      "video-watermark-remover": 2,
    },
  },
  credits: {
    action: "grant",
    data: {
      id: "PASTE_USER_UUID",
      tool: "background-remover",
      units: 1,
      expires_at: "SET_UTC_EXPIRY",
      request_key: "SET_UUID",
    },
  },
  settings: {
    action: "settings",
    data: { support_email: "bellixus062@gmail.com", social_links: [] },
  },
  tools: {
    action: "tool",
    data: {
      id: "PASTE_TOOL_UUID",
      enabled: true,
      max_bytes: 104857600,
      max_duration_seconds: 120,
      max_width: 3840,
      max_height: 3840,
    },
  },
  roles: { action: "role", data: { id: "PASTE_USER_UUID", role: "user" } },
};
export function AdminPanel({ section = "" }: { section?: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [metrics, setMetrics] = useState<Record<string, unknown>>({}),
    [role, setRole] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [page, setPage] = useState(1),
    [count, setCount] = useState(0),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [editor, setEditor] = useState(JSON.stringify(templates[section] || {}, null, 2)),
    [reason, setReason] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const me = await accountApi("me");
      setRole(me.user.role);
      if (!section) {
        if (me.user.role === "superadmin") setMetrics(await accountApi("admin/dashboard"));
        else setMetrics({ notice: "Support access: use Contact Inbox and Users." });
      } else {
        const data = await accountApi(
          `admin/${section}?page=${page}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`,
        );
        setRows(data.rows);
        setCount(data.count);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [section, page, status, search]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let payload = JSON.parse(editor);
      if (payload.action === "grant")
        payload = {
          ...payload,
          data: {
            ...payload.data,
            request_key:
              payload.data.request_key === "SET_UUID"
                ? crypto.randomUUID()
                : payload.data.request_key,
          },
        };
      await accountApi("admin/mutate", { ...payload, reason });
      setNotice("Saved and audited.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function download() {
    setError("");
    try {
      const { exportToExcel } = await import("@/lib/excelExport");
      const data = section ? rows : [metrics];
      const normalized = data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value && typeof value === "object" ? JSON.stringify(value) : value,
          ]),
        ),
      );
      exportToExcel(
        normalized,
        Object.keys(normalized[0] || {}).map((key) => ({ header: key.replaceAll("_", " "), key })),
        "Bellix",
        `Bellix_${section || "dashboard"}`,
      );
      setNotice("Excel downloaded for the visible page and filters.");
    } catch {
      setError("Export failed. Please retry.");
    }
  }
  function updateField(key: string, value: unknown) {
    try {
      const draft = JSON.parse(editor);
      setEditor(JSON.stringify({ ...draft, data: { ...draft.data, [key]: value } }, null, 2));
    } catch {
      setError("Correct the advanced fields before using the form.");
    }
  }
  let fields: Record<string, unknown> = {};
  try {
    fields = JSON.parse(editor).data || {};
  } catch {
    /* The advanced editor validates on save. */
  }
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <Link className="admin-wordmark" href="/admin">
          Bellix<span>✦</span>
        </Link>
        <small>Admin workspace</small>
        <nav>
          <Link href="/admin" aria-current={!section ? "page" : undefined}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          {adminSections
            .filter((s) => role === "superadmin" || ["users", "contact"].includes(s))
            .map((s) => (
              <Link key={s} href={`/admin/${s}`} aria-current={section === s ? "page" : undefined}>
                <ChevronRight size={14} />
                {labels[s] || s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            ))}
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Bellix · {role || "Workspace"}</p>
            <h1>
              {labels[section] ||
                (section ? section.charAt(0).toUpperCase() + section.slice(1) : "Dashboard")}
            </h1>
          </div>
          <div className="admin-actions">
            <button className="admin-secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              className="admin-primary"
              disabled={loading || Boolean(error)}
              onClick={() => void download()}
            >
              <Download size={16} />
              Download Excel
            </button>
            <button
              className="admin-secondary"
              onClick={async () => {
                await accountApi("logout", {});
                window.location.reload();
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </header>
        <div className="admin-content">
          {loading && <p role="status">Loading database records…</p>}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {!section && !loading && !error && (
            <div className="admin-metrics">
              {Object.entries(metrics).map(([key, value]) => (
                <article className="admin-metric" key={key}>
                  <p>{key.replaceAll("_", " ")}</p>
                  {value && typeof value === "object" ? (
                    <pre className="text-sm mt-4 whitespace-pre-wrap">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <strong>{String(value ?? "—")}</strong>
                  )}
                </article>
              ))}
            </div>
          )}
          {section && (
            <>
              {section === "plans" && role === "superadmin" && (
                <form
                  className="admin-editor space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    setSaving(true);
                    setError("");
                    try {
                      await accountApi("admin/recurring", {
                        plan_id: form.get("plan_id"),
                        provider_plan_id: form.get("provider_plan_id"),
                        total_count: Number(form.get("total_count")),
                        enabled: form.get("enabled") === "on",
                        reason: form.get("reason"),
                      });
                      setNotice(
                        "Recurring billing configured and audited. Published pricing was checked against Razorpay.",
                      );
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <h2>Configure automatic billing</h2>
                  <p>
                    Use an existing published plan version and a matching Razorpay weekly/monthly
                    plan. Create a new Bellix version to change a plan with existing mandates.
                  </p>
                  {[
                    ["plan_id", "Bellix plan UUID"],
                    ["provider_plan_id", "Razorpay plan ID"],
                    ["total_count", "Number of billing cycles"],
                    ["reason", "Reason"],
                  ].map(([name, label]) => (
                    <label className="block" key={name}>
                      {label}
                      <input
                        className="block w-full border rounded p-3 mt-2"
                        name={name}
                        required
                        type={name === "total_count" ? "number" : "text"}
                        min={name === "total_count" ? 1 : undefined}
                        max={name === "total_count" ? 1000 : undefined}
                      />
                    </label>
                  ))}
                  <label className="flex gap-3">
                    <input type="checkbox" name="enabled" />
                    Offer automatic renewal at checkout
                  </label>
                  <button className="admin-primary" disabled={saving}>
                    Validate gateway plan and save
                  </button>
                </form>
              )}
              {section === "roles" && role === "superadmin" && (
                <form
                  className="admin-editor space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    setSaving(true);
                    setError("");
                    try {
                      await accountApi("admin/team-access", {
                        email: form.get("email"),
                        role: form.get("role"),
                        reason: form.get("reason"),
                      });
                      setNotice("Team permissions updated and audited.");
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <h2>Add or update a team member</h2>
                  <p>
                    The team member must first create and verify a Bellix account. Support admins
                    can manage contacts and view users. Only the superadmin controls billing and
                    permissions.
                  </p>
                  <label className="block">
                    Team email
                    <input
                      className="block w-full border rounded p-3 mt-2"
                      type="email"
                      name="email"
                      required
                    />
                  </label>
                  <label className="block">
                    Access
                    <select className="block w-full border rounded p-3 mt-2" name="role">
                      <option value="admin">Support admin</option>
                      <option value="user">Remove admin access</option>
                    </select>
                  </label>
                  <label className="block">
                    Reason
                    <input
                      className="block w-full border rounded p-3 mt-2"
                      name="reason"
                      minLength={3}
                      maxLength={1000}
                      required
                    />
                  </label>
                  <button className="admin-primary" disabled={saving}>
                    Save team access
                  </button>
                </form>
              )}
              <div className="admin-filters">
                <label>
                  Status filter
                  <input
                    className="border rounded p-2"
                    value={status}
                    onChange={(e) => {
                      setPage(1);
                      setStatus(e.target.value);
                    }}
                    placeholder="All statuses"
                  />
                </label>
                {section === "users" && (
                  <label>
                    Search email
                    <input
                      className="border rounded p-2"
                      value={search}
                      onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                      }}
                    />
                  </label>
                )}
                <button onClick={() => void load()}>Refresh</button>
              </div>
              {!loading && (
                <>
                  <RecordTable rows={rows} />
                  <Pagination page={page} count={count} change={setPage} />
                </>
              )}
              {templates[section] && (role === "superadmin" || section === "contact") && (
                <form onSubmit={save} className="admin-editor space-y-4">
                  <h2 className="text-xl">Validated changes</h2>
                  {section === "plans" && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() => setEditor(JSON.stringify(templates.plans, null, 2))}
                      >
                        Create draft version
                      </button>
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() =>
                          setEditor(
                            JSON.stringify(
                              { action: "plan_status", data: { id: "", status: "draft" } },
                              null,
                              2,
                            ),
                          )
                        }
                      >
                        Publish or disable plan
                      </button>
                    </div>
                  )}
                  <p>
                    Use the record UUID above. Every mutation requires a reason and is audited.
                    Amounts use minor currency units. New plans are always drafts; publish
                    explicitly with action plan_status after checking prices and allowances.
                    Existing versions remain unchanged.
                  </p>
                  {Object.entries(fields)
                    .filter(([, value]) => !Array.isArray(value) && typeof value !== "object")
                    .map(([key, value]) => (
                      <label className="block" key={key}>
                        {key.replaceAll("_", " ")}
                        {typeof value === "boolean" ? (
                          <input
                            type="checkbox"
                            className="ml-3"
                            checked={value}
                            onChange={(e) => updateField(key, e.target.checked)}
                          />
                        ) : key === "status" ? (
                          <select
                            className="block w-full border rounded p-3 mt-2"
                            value={String(value)}
                            onChange={(e) => updateField(key, e.target.value)}
                          >
                            {(section === "contact"
                              ? ["unread", "read", "pending", "resolved"]
                              : section === "plans"
                                ? ["draft", "published", "disabled"]
                                : ["active", "suspended", "closed"]
                            ).map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="block w-full border rounded p-3 mt-2"
                            value={String(value ?? "")}
                            onChange={(e) =>
                              updateField(
                                key,
                                typeof value === "number" ? Number(e.target.value) : e.target.value,
                              )
                            }
                            type={typeof value === "number" ? "number" : "text"}
                          />
                        )}
                      </label>
                    ))}
                  <details>
                    <summary className="cursor-pointer text-sm">
                      Advanced fields and tool allowances
                    </summary>
                    <label className="block mt-3">
                      Action and fields
                      <textarea
                        aria-label="Action and fields"
                        className="block w-full font-mono text-sm border rounded-xl p-4"
                        rows={14}
                        value={editor}
                        onChange={(e) => setEditor(e.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  </details>
                  <label className="block">
                    Reason
                    <input
                      className="block w-full border rounded p-3"
                      required
                      minLength={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={saving}
                    className="bg-[#10241e] text-white rounded-xl px-5 py-3"
                  >
                    {saving ? "Saving…" : "Validate and save"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
