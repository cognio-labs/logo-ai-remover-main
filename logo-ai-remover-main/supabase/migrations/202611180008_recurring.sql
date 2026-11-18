begin;
-- Automatic billing is explicitly configured separately from manual plan prices.
create table bellix.recurring_configs (
 id uuid primary key default gen_random_uuid(), plan_id uuid not null references bellix.plans(id),
 environment text not null check(environment in ('test','live')), provider_plan_id text not null,
 total_count integer not null check(total_count between 1 and 1000), enabled boolean not null default false,
 created_at timestamptz not null default now(), unique(plan_id,environment)
);
create table bellix.recurring_contracts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id),
 plan_id uuid not null references bellix.plans(id), request_key uuid not null, snapshot jsonb not null,
 environment text not null check(environment in ('test','live')), provider_plan_id text not null,
 provider_subscription_id text unique, total_count integer not null, scheduled_start timestamptz,
 status text not null default 'creating' check(status in ('creating','creation_unknown','created','authenticated','active','pending','halted','cancelled','completed','expired')),
 cancel_at_period_end boolean not null default false, created_at timestamptz not null default now(), unique(user_id,request_key)
);
alter table bellix.recurring_configs enable row level security;
alter table bellix.recurring_contracts enable row level security;
revoke all on bellix.recurring_configs,bellix.recurring_contracts from public,anon,authenticated;
grant all on bellix.recurring_configs,bellix.recurring_contracts to service_role;
grant select on bellix.recurring_contracts to authenticated;
create policy owner_read on bellix.recurring_contracts for select to authenticated using(user_id=auth.uid());
alter table bellix.subscriptions drop constraint subscriptions_renewal_mode_check;
alter table bellix.subscriptions add constraint subscriptions_renewal_mode_check check(renewal_mode in ('manual','automatic'));
alter table bellix.subscriptions add column recurring_contract_id uuid references bellix.recurring_contracts(id);
create unique index recurring_period_once on bellix.subscriptions(recurring_contract_id,current_period_start) where recurring_contract_id is not null;

create function bellix.configure_recurring(p_actor uuid,p_plan uuid,p_environment text,p_provider_plan text,p_count integer,p_enabled boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from bellix.user_roles r join bellix.profiles p on p.id=r.user_id where r.user_id=p_actor and r.role='superadmin' and p.status='active') then raise exception 'forbidden'; end if;
 if length(trim(p_reason))<3 then raise exception 'reason_required'; end if;
 if exists(select 1 from bellix.recurring_contracts where plan_id=p_plan and environment=p_environment) then raise exception 'create_new_plan_version'; end if;
 insert into bellix.recurring_configs(plan_id,environment,provider_plan_id,total_count,enabled) values(p_plan,p_environment,p_provider_plan,p_count,p_enabled)
 on conflict(plan_id,environment) do update set provider_plan_id=excluded.provider_plan_id,total_count=excluded.total_count,enabled=excluded.enabled;
 insert into bellix.admin_audit_logs(actor_id,action,entity,entity_id,reason,after_data) values(p_actor,'configure_recurring','plans',p_plan,p_reason,jsonb_build_object('provider_plan',p_provider_plan,'environment',p_environment,'total_count',p_count,'enabled',p_enabled));
end $$;

create function bellix.create_recurring(p_user uuid,p_plan uuid,p_request uuid,p_environment text) returns bellix.recurring_contracts
language plpgsql security definer set search_path='' as $$
declare c bellix.recurring_contracts; cfg bellix.recurring_configs; p bellix.plans; price bellix.plan_prices; snapshot jsonb; starting timestamptz;
begin
 perform bellix.initialize_account(p_user);
 perform 1 from bellix.profiles where id=p_user and status='active' for update;
 if not found then raise exception 'account_unavailable'; end if;
 select * into c from bellix.recurring_contracts where user_id=p_user and request_key=p_request;
 if found then if c.plan_id<>p_plan or c.environment<>p_environment then raise exception 'idempotency_conflict'; end if; return c; end if;
 if exists(select 1 from bellix.recurring_contracts where user_id=p_user and status not in ('cancelled','completed','expired')) then raise exception 'existing_automatic_subscription'; end if;
 select * into cfg from bellix.recurring_configs where plan_id=p_plan and environment=p_environment and enabled;
 select * into p from bellix.plans where id=p_plan and status='published' and kind='plan';
 select * into price from bellix.plan_prices where plan_id=p_plan;
 if cfg.id is null or p.id is null or price.amount is null or price.interval is null then raise exception 'plan_unavailable'; end if;
 select to_jsonb(p)||jsonb_build_object('price',to_jsonb(price),'limits',coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb)) into snapshot from bellix.plan_tool_limits l where l.plan_id=p.id;
 select max(current_period_end) into starting from bellix.subscriptions where user_id=p_user and status in ('active','cancelled') and current_period_end>now();
 insert into bellix.recurring_contracts(user_id,plan_id,request_key,snapshot,environment,provider_plan_id,total_count,scheduled_start) values(p_user,p_plan,p_request,snapshot,p_environment,cfg.provider_plan_id,cfg.total_count,starting) returning * into c;
 return c;
end $$;

create function bellix.fulfill_recurring(p_contract uuid,p_provider_order text,p_payment text,p_amount bigint,p_currency text,p_environment text,p_start timestamptz,p_end timestamptz,p_event text,p_refunds jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare c bellix.recurring_contracts; o bellix.orders; pay uuid; period bellix.billing_periods; item jsonb;
begin
 select * into c from bellix.recurring_contracts where id=p_contract for update;
 if c.id is null or c.environment<>p_environment or (c.snapshot->'price'->>'amount')::bigint<>p_amount or c.snapshot->'price'->>'currency'<>p_currency or p_start is null or p_end is null or p_end<=p_start then raise exception 'payment_mismatch'; end if;
 select id into pay from bellix.payments where provider_payment_id=p_payment;
 if pay is not null then
 if not exists(select 1 from bellix.payments x join bellix.orders ord on ord.id=x.order_id where x.id=pay and ord.user_id=c.user_id and ord.provider_order_id=p_provider_order) then raise exception 'payment_mismatch'; end if;
 else
 insert into bellix.orders(user_id,plan_id,request_key,snapshot,amount,currency,environment,provider_order_id,status) values(c.user_id,c.plan_id,gen_random_uuid(),c.snapshot,p_amount,p_currency,p_environment,p_provider_order,'pending') returning * into o;
 pay:=bellix.fulfill_payment(p_provider_order,p_payment,p_amount,p_currency,p_environment,p_event);
 select * into period from bellix.billing_periods where payment_id=pay;
 update bellix.billing_periods set starts_at=p_start,ends_at=p_end where id=period.id;
 update bellix.subscriptions set renewal_mode='automatic',recurring_contract_id=c.id,current_period_start=p_start,current_period_end=p_end where id=period.subscription_id;
 update bellix.credit_grants set starts_at=p_start,expires_at=p_end where source_reference=period.id::text;
 end if;
 for item in select * from jsonb_array_elements(coalesce(p_refunds,'[]'::jsonb)) loop
 perform bellix.record_refund(p_payment,item->>'id',(item->>'amount')::bigint,item->>'status');
 end loop;
 return pay;
end $$;
revoke all on function bellix.configure_recurring(uuid,uuid,text,text,integer,boolean,text),bellix.create_recurring(uuid,uuid,uuid,text),bellix.fulfill_recurring(uuid,text,text,bigint,text,text,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function bellix.configure_recurring(uuid,uuid,text,text,integer,boolean,text),bellix.create_recurring(uuid,uuid,uuid,text),bellix.fulfill_recurring(uuid,text,text,bigint,text,text,timestamptz,timestamptz,text,jsonb) to service_role;
commit;
