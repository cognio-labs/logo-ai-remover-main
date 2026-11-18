import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
};
await db.exec(
  `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
if (process.argv.includes("--bundle")) {
  await db.exec(await fs.readFile("supabase/BELLIX_FRESH_INSTALL.sql", "utf8"));
} else {
  for (const file of (await fs.readdir("supabase/migrations"))
    .filter((f) => f.startsWith("20261118"))
    .sort())
    await db.exec(await fs.readFile(`supabase/migrations/${file}`, "utf8"));
}
const user = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  owner = "10000000-0000-4000-8000-000000000003";
for (const id of [user, other, owner])
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())`, [
    id,
    `${id}@example.invalid`,
  ]);
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
async function reject(sql, args = []) {
  await assert.rejects(() => db.query(sql, args));
}
await test("exact separate 2/3/2 trial and one-time initialize", async () => {
  const grants = (
    await db.query(
      `select t.slug,g.granted_units from bellix.credit_grants g join bellix.tools t on t.id=g.tool_id where user_id=$1 order by t.slug`,
      [user],
    )
  ).rows;
  assert.deepEqual(
    grants.map((g) => g.granted_units),
    [2, 3, 2],
  );
  await db.query("select bellix.initialize_account($1)", [user]);
  assert.equal(
    await scalar("select count(*)::int from bellix.credit_grants where user_id=$1", [user]),
    3,
  );
});
const reserve = async (key = crypto.randomUUID(), uid = user) =>
  scalar(
    `select to_jsonb(bellix.reserve_job($1,'background-remover',$2,'{"bytes":100}', 'browser'))`,
    [uid, key],
  );
let first;
await test("reservation retry and completion are idempotent", async () => {
  const key = crypto.randomUUID();
  first = await reserve(key);
  assert.equal((await reserve(key)).id, first.id);
  await db.query("select bellix.settle_job($1,true)", [first.id]);
  await db.query("select bellix.settle_job($1,true)", [first.id]);
  assert.equal(
    await scalar(`select consumed_units from bellix.credit_grants where id=$1`, [first.grant_id]),
    1,
  );
});
await test("last credit admits one competing request", async () => {
  const result = await Promise.allSettled([reserve(), reserve()]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const job = result.find((r) => r.status === "fulfilled").value;
  await db.query("select bellix.settle_job($1,false)", [job.id]);
  assert.equal(
    await scalar("select reserved_units from bellix.credit_grants where id=$1", [job.grant_id]),
    0,
  );
});
await test("timeout releases credit; late success cannot consume", async () => {
  const job = await reserve();
  await db.query(
    `update bellix.processing_jobs set deadline=now()-interval '1 minute' where id=$1`,
    [job.id],
  );
  await db.query("select bellix.settle_job($1,true)", [job.id]);
  assert.equal(
    await scalar("select status from bellix.processing_jobs where id=$1", [job.id]),
    "timed_out",
  );
});
await test("expired grants reject new work", async () => {
  await db.query(
    `update bellix.credit_grants set starts_at=now()-interval '2 days',expires_at=now()-interval '1 day' where user_id=$1`,
    [other],
  );
  await reject(`select bellix.reserve_job($1,'background-remover',$2,'{"bytes":100}','browser')`, [
    other,
    crypto.randomUUID(),
  ]);
});
await test("RLS isolates users; roles/credits/payments cannot be mutated", async () => {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`,
  );
  assert.equal(
    await scalar("select count(*)::int from bellix.credit_grants where user_id=$1", [other]),
    0,
  );
  await reject("update bellix.user_roles set role='superadmin' where user_id=$1", [user]);
  await reject("update bellix.credit_grants set granted_units=999 where user_id=$1", [user]);
  await reject(`select bellix.initialize_account($1)`, [other]);
  await db.exec("reset role");
});
await test("support cannot grant credits; emergency grants audit and expire", async () => {
  await db.query(`update bellix.user_roles set role='admin' where user_id=$1`, [owner]);
  await reject(`select bellix.admin_mutate($1,'grant',$2,'test reason')`, [
    owner,
    {
      id: user,
      tool: "background-remover",
      units: 3,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      request_key: crypto.randomUUID(),
    },
  ]);
  await db.query(`update bellix.user_roles set role='superadmin' where user_id=$1`, [owner]);
  const grant = await scalar(`select bellix.admin_mutate($1,'grant',$2,'test reason')`, [
    owner,
    {
      id: user,
      tool: "background-remover",
      units: 3,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      request_key: crypto.randomUUID(),
    },
  ]);
  assert.equal(
    await scalar(`select count(*)::int from bellix.admin_audit_logs where action='grant'`),
    1,
  );
  await db.query(
    `update bellix.credit_grants set starts_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1`,
    [grant.id],
  );
});
let order, plan;
await test("draft plan version, snapshot and trusted purchase price", async () => {
  plan = await scalar(`select bellix.admin_mutate($1,'plan',$2,'test price configuration')`, [
    owner,
    {
      name: "Test only",
      kind: "plan",
      amount: 100,
      currency: "INR",
      interval: "monthly",
      limits: [{ tool: "video-watermark-remover", units: 2 }],
    },
  ]);
  await reject("select bellix.create_order($1,$2,$3,'test')", [user, plan.id, crypto.randomUUID()]);
  await db.query(`select bellix.admin_mutate($1,'plan_status',$2,'publish test plan')`, [
    owner,
    { id: plan.id, status: "published" },
  ]);
  order = await scalar(`select to_jsonb(bellix.create_order($1,$2,$3,'test'))`, [
    user,
    plan.id,
    crypto.randomUUID(),
  ]);
  await db.query(
    `update bellix.orders set provider_order_id='order_test',status='pending' where id=$1`,
    [order.id],
  );
  assert.equal(order.amount, 100);
});
await test("wrong amount rejected; duplicate capture and webhook grant once", async () => {
  await reject(`select bellix.fulfill_payment('order_test','pay_test',999,'INR','test')`);
  await db.query(
    `select bellix.fulfill_payment('order_test','pay_test',100,'INR','test','event_one')`,
  );
  await db.query(
    `select bellix.fulfill_payment('order_test','pay_test',100,'INR','test','event_one')`,
  );
  assert.equal(await scalar(`select count(*)::int from bellix.payments`), 1);
  assert.equal(await scalar(`select count(*)::int from bellix.billing_periods`), 1);
  assert.equal(
    await scalar(`select count(*)::int from bellix.credit_grants where source='plan'`),
    1,
  );
});
await test("refund is idempotent and revokes only purchase benefits", async () => {
  await db.query(`select bellix.record_refund('pay_test','rfnd_test',100,'processed')`);
  await db.query(`select bellix.record_refund('pay_test','rfnd_test',100,'processed')`);
  assert.equal(await scalar(`select count(*)::int from bellix.refunds`), 1);
  assert.equal(
    await scalar(
      `select count(*)::int from bellix.credit_grants where source='plan' and revoked_at is not null`,
    ),
    1,
  );
  assert.equal(
    await scalar(
      `select count(*)::int from bellix.credit_grants where source='trial' and revoked_at is not null`,
    ),
    0,
  );
});
await test("four-day reminders, maintenance retries and duplicates", async () => {
  await db.query(`update bellix.profiles set trial_ends_at=now()+interval '4 days' where id=$1`, [
    owner,
  ]);
  await db.query("select bellix.maintenance()");
  const count = await scalar("select count(*)::int from bellix.notifications");
  await db.query("select bellix.maintenance()");
  assert.equal(await scalar("select count(*)::int from bellix.notifications"), count);
  await db.query("select bellix.claim_emails(false)");
  assert.ok(
    (await scalar(`select count(*)::int from bellix.notifications where status='awaiting_setup'`)) >
      0,
  );
});
await test("contact persistence is independent of email; anonymous cannot read", async () => {
  await db.query(
    `insert into bellix.contact_messages(name,email,subject,message) values('Test','test@example.invalid','Test','This is a test message')`,
  );
  await db.exec("set role anon");
  await reject("select * from bellix.contact_messages");
  await db.exec("reset role");
  assert.equal(await scalar("select count(*)::int from bellix.contact_messages"), 1);
});
await test("persistent rate limiter rejects sixth submission", async () => {
  for (let i = 0; i < 5; i++)
    assert.equal(await scalar(`select bellix.rate_limit('test',5,3600)`), true);
  assert.equal(await scalar(`select bellix.rate_limit('test',5,3600)`), false);
});
await test("team access requires superadmin and verified existing account; role changes audited", async () => {
  await reject(`select bellix.team_access($1,$2,'admin','team setup')`, [
    user,
    `${other}@example.invalid`,
  ]);
  await db.query(`select bellix.team_access($1,$2,'admin','team setup')`, [
    owner,
    `${other}@example.invalid`,
  ]);
  assert.equal(
    await scalar(`select role from bellix.user_roles where user_id=$1`, [other]),
    "admin",
  );
  await reject(`select bellix.team_access($1,'missing@example.invalid','admin','team setup')`, [
    owner,
  ]);
  assert.ok(await scalar(`select count(*)::int from bellix.admin_audit_logs where action='role'`));
});
let contract;
await test("recurring contract creation is idempotent, owned and grants no credits", async () => {
  await db.query(
    `select bellix.configure_recurring($1,$2,'test','plan_mock',6,true,'test recurring configuration')`,
    [owner, plan.id],
  );
  const before = await scalar(`select count(*)::int from bellix.credit_grants`);
  const key = crypto.randomUUID();
  contract = await scalar(`select to_jsonb(bellix.create_recurring($1,$2,$3,'test'))`, [
    user,
    plan.id,
    key,
  ]);
  const retry = await scalar(`select to_jsonb(bellix.create_recurring($1,$2,$3,'test'))`, [
    user,
    plan.id,
    key,
  ]);
  assert.equal(contract.id, retry.id);
  assert.equal(await scalar(`select count(*)::int from bellix.credit_grants`), before);
  await reject(`select bellix.create_recurring($1,$2,$3,'test')`, [
    user,
    plan.id,
    crypto.randomUUID(),
  ]);
});
await test("recurring capture validates amount and creates exactly one provider-dated period", async () => {
  const before = await scalar(`select count(*)::int from bellix.billing_periods`);
  const query = `select bellix.fulfill_recurring($1,'order_recurring','pay_recurring',$2,'INR','test',now()-interval '1 day',now()+interval '3 days','evt_recurring','[]')`;
  await reject(query, [contract.id, 999]);
  await db.query(query, [contract.id, 100]);
  await db.query(query, [contract.id, 100]);
  assert.equal(await scalar(`select count(*)::int from bellix.billing_periods`), before + 1);
  assert.equal(
    await scalar(
      `select count(*)::int from bellix.subscriptions where recurring_contract_id=$1 and renewal_mode='automatic'`,
      [contract.id],
    ),
    1,
  );
  await db.query(`update bellix.recurring_contracts set status='active' where id=$1`, [
    contract.id,
  ]);
  await db.query(`select bellix.maintenance()`);
  assert.ok(
    await scalar(
      `select count(*)::int from bellix.notifications where body like '%scheduled to renew%'`,
    ),
  );
});
await test("out-of-order recurring paid periods retain their own dates and no duplicate grants", async () => {
  await db.query(
    `select bellix.fulfill_recurring($1,'order_old','pay_old',100,'INR','test',now()-interval '2 months',now()-interval '1 month','evt_old','[]')`,
    [contract.id],
  );
  assert.equal(
    await scalar(
      `select count(*)::int from bellix.credit_grants where expires_at>now() and source='plan' and revoked_at is null`,
    ),
    1,
  );
});
console.log(
  `${passed} database integration tests passed (embedded PostgreSQL; not a live Supabase certification).`,
);
await db.close();
