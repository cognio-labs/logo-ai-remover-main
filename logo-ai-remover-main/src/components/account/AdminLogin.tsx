"use client";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, ArrowRight } from "lucide-react";

export function AdminLogin() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.error || "Sign-in service unavailable. Please retry.");
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-auth">
      <div className="admin-auth-card">
        <aside className="admin-auth-story">
          <a href="/" className="admin-wordmark">
            Bellix<span>✦</span>
          </a>
          <p className="admin-tagline">Smart tools. Better results.</p>
          <div className="admin-shield">
            <ShieldCheck size={142} strokeWidth={1.1} />
          </div>
          <h1>
            Admin <span>Panel</span>
          </h1>
          <p className="admin-subtitle">Secure access only</p>
          <ul>
            {[
              "Manage users",
              "Review payments",
              "Control your workspace",
              "Track every change",
            ].map((text) => (
              <li key={text}>
                <ShieldCheck size={19} />
                {text}
              </li>
            ))}
          </ul>
          <div className="admin-safety">
            <LockKeyhole size={17} /> Your Bellix workspace, protected.
          </div>
        </aside>
        <section className="admin-auth-form">
          <div className="admin-login-mark">
            B<span>✦</span>
          </div>
          <h2>Welcome back</h2>
          <p>Sign in to your admin workspace</p>
          <form onSubmit={login}>
            <label htmlFor="admin-user">Username or team email</label>
            <div className="admin-input">
              <UserRound size={21} />
              <input
                id="admin-user"
                name="username"
                autoComplete="username"
                required
                defaultValue="bellix"
                placeholder="bellix"
                maxLength={254}
              />
            </div>
            <label htmlFor="admin-pass">Password</label>
            <div className="admin-input">
              <LockKeyhole size={21} />
              <input
                id="admin-pass"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={256}
                placeholder="bellix@1234@1"
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-primary admin-login-submit" disabled={busy}>
              {busy ? (
                "Verifying access…"
              ) : (
                <>
                  Login <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
          <div className="admin-authorized">
            <ShieldCheck size={22} /> Authorized access only
          </div>
          <p className="admin-auth-help">
            Team members need an administrator-assigned role. Contact your workspace owner for
            access or a password reset.
          </p>
        </section>
      </div>
    </main>
  );
}
