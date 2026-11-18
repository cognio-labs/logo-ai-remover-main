import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ApiError, body, failure } from "@/lib/server/bellix";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = z
      .object({
        username: z.string().trim().min(1).max(254),
        password: z.string().min(1).max(256),
      })
      .parse(await body(request));

    const normUser = input.username.toLowerCase();
    const masterPassword = process.env.ADMIN_LOGIN_PASSWORD || "bellix@1234@1";
    const envUser = process.env.ADMIN_LOGIN_USERNAME?.toLowerCase();

    // Check for Master SuperAdmin credentials
    const isMasterUser =
      normUser === "bellix" ||
      normUser === "admin" ||
      normUser === "admin@n8n.local" ||
      normUser === "bellixus062@gmail.com" ||
      normUser === "aryanthealgohype@gmail.com" ||
      (envUser && normUser === envUser);

    const isMasterPass = input.password === masterPassword || input.password === "bellix@1234@1";

    if (isMasterUser && isMasterPass) {
      const cookieStore = await cookies();
      cookieStore.set("bellix-session", "bellix_admin_auth_token_2026", {
        httpOnly: true,
        secure: new URL(request.url).protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return Response.json(
        { success: true, message: "Welcome to Bellix Admin Workspace" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Secondary Supabase Auth Check if configured
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const auth = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await auth.auth.signInWithPassword({
          email: input.username,
          password: input.password,
        });
        if (!error && data.session && data.user) {
          const cookieStore = await cookies();
          cookieStore.set("bellix-session", data.session.access_token, {
            httpOnly: true,
            secure: new URL(request.url).protocol === "https:",
            sameSite: "lax",
            path: "/",
            maxAge: data.session.expires_in,
          });
          return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
        }
      } catch {
        // Fall through to 401
      }
    }

    throw new ApiError(
      401,
      "Invalid username or password. Please use username 'bellix' and password 'bellix@1234@1'.",
    );
  } catch (e) {
    return failure(e);
  }
}
