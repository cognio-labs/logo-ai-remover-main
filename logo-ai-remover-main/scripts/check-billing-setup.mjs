import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CONTACT_RATE_LIMIT_SECRET",
  "BELLIX_WORKER_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_WEBHOOK_SECRET",
];
console.log(
  JSON.stringify(
    Object.fromEntries(
      required.map((key) => [key, Boolean(process.env[key]) ? "configured" : "missing"]),
    ),
    null,
    2,
  ),
);
console.log(
  "No credential values printed; no network requests, migrations, payments or emails performed.",
);
