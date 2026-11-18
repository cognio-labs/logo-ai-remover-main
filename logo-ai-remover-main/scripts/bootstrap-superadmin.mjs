import { createClient } from "@supabase/supabase-js";
const [id, ...reason] = process.argv.slice(2);
if (!/^[0-9a-f-]{36}$/i.test(id || "") || reason.join(" ").length < 10)
  throw new Error(
    "Usage: node --env-file=.env.local scripts/bootstrap-superadmin.mjs VERIFIED_USER_UUID mandatory reason",
  );
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL)
  throw new Error("Server Supabase configuration required");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "bellix" },
  auth: { persistSession: false },
});
const { error } = await db.rpc("bootstrap_superadmin", { p_user: id, p_reason: reason.join(" ") });
if (error)
  throw new Error(
    "Bootstrap rejected. Confirm verified account, reviewed migration and absence of an existing superadmin.",
  );
console.log("First superadmin granted and audited.");
