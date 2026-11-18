-- Bellix: fresh installation bundle for Supabase SQL Editor.
-- Generated from migrations 202611180001 through 202611180009.
-- Run as the project database owner in SQL Editor. Review/back up first.
-- This creates the bellix schema and financial/auth permissions; no admin password is embedded.
-- The bundle is atomic: any error rolls the entire install back.
-- Existing Bellix tables are deliberately rejected. Do not drop production tables to retry.

begin;
do $preflight$
begin
 if to_regclass('bellix.profiles') is not null
    or to_regclass('bellix.orders') is not null
    or to_regclass('bellix.credit_grants') is not null then
   raise exception 'Bellix is already installed or partially installed. Stop and apply only missing migrations; do not rerun this fresh-install bundle.';
 end if;
end $preflight$;

-- SOURCE: 202611180001_bellix_core.sql
-- Review against a schema-only production dump before applying. No legacy data is deleted.

create schema if not exists bellix;
revoke all on schema bellix from public, anon;
grant usage on schema bellix to authenticated, service_role;
alter default privileges in schema bellix revoke execute on functions from public;
alter default privileges in schema bellix revoke all on tables from anon, authenticated;

create table bellix.profiles (
 id uuid primary key references auth.users(id), name text not null default '', email text not null,
 status text not null default 'active' check(status in ('active','suspended','closed')),
 trial_started_at timestamptz, trial_ends_at timestamptz, created_at timestamptz not null default now()
);
create table bellix.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references bellix.profiles(id), role text not null check(role in ('user','admin','superadmin')) default 'user');
create table bellix.tools (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
 enabled boolean not null default true, max_bytes bigint not null check(max_bytes>0),
 max_duration_seconds numeric check(max_duration_seconds>0), max_width integer check(max_width>0), max_height integer check(max_height>0),
 execution text not null check(execution in ('browser','server')), created_at timestamptz not null default now()
);
create table bellix.site_settings(id uuid primary key default gen_random_uuid(), key text unique not null, value jsonb not null, updated_at timestamptz not null default now());
insert into bellix.site_settings(key,value) values ('trial','{"days":7,"background-remover":2,"gemini-image-watermark-remover":3,"video-watermark-remover":2,"status":"draft-default"}'),('website','{"support_email":"bellixus062@gmail.com","social_links":[]}');
-- Limits are editable source-level safeguards, not promises of guaranteed output quality.
insert into bellix.tools(slug,name,max_bytes,max_duration_seconds,max_width,max_height,execution) values
 ('background-remover','Background remover',36700160,null,null,null,'browser'),
 ('gemini-image-watermark-remover','Gemini image watermark remover',26214400,null,null,null,'browser'),
 ('video-watermark-remover','Video watermark remover',104857600,120,3840,3840,'server');
create table bellix.plans(id uuid primary key default gen_random_uuid(), family_id uuid not null default gen_random_uuid(), version integer not null check(version>0) default 1,
 name text not null, description text not null default '', kind text not null default 'plan' check(kind in ('plan','topup')),
 status text not null default 'draft' check(status in ('draft','published','disabled')), renewal_mode text not null default 'manual' check(renewal_mode='manual'),
 validity_days integer check(validity_days>0), requires_active_plan boolean not null default false, rollover boolean not null default false check(not rollover),
 created_at timestamptz not null default now(), unique(family_id,version));
create table bellix.plan_prices(id uuid primary key default gen_random_uuid(), plan_id uuid not null unique references bellix.plans(id), amount bigint check(amount>0), currency text check(currency ~ '^[A-Z]{3}$'), interval text check(interval in ('weekly','monthly')), gateway_price_id text);
create table bellix.plan_tool_limits(id uuid primary key default gen_random_uuid(), plan_id uuid not null references bellix.plans(id), tool_id uuid not null references bellix.tools(id), units integer not null check(units>=0), max_bytes bigint not null check(max_bytes>0), max_duration_seconds numeric check(max_duration_seconds>0), max_width integer check(max_width>0), max_height integer check(max_height>0), unique(plan_id,tool_id));
create table bellix.subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), plan_id uuid not null references bellix.plans(id), status text not null check(status in ('active','cancelled','expired','payment_failed')), renewal_mode text not null default 'manual' check(renewal_mode='manual'), current_period_start timestamptz not null, current_period_end timestamptz not null, scheduled_plan_id uuid references bellix.plans(id), created_at timestamptz not null default now(), check(current_period_end>current_period_start));
create table bellix.orders(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), plan_id uuid not null references bellix.plans(id), request_key uuid not null, snapshot jsonb not null, amount bigint not null check(amount>0), currency text not null check(currency ~ '^[A-Z]{3}$'), environment text not null check(environment in ('test','live')), provider_order_id text unique, status text not null default 'creating' check(status in ('creating','pending','paid','failed','refunded','creation_unknown')), created_at timestamptz not null default now(), unique(user_id,request_key));
create table bellix.payments(id uuid primary key default gen_random_uuid(), order_id uuid not null references bellix.orders(id), user_id uuid not null references bellix.profiles(id), provider_payment_id text unique not null, amount bigint not null check(amount>0), currency text not null, status text not null check(status in ('captured','partially_refunded','refunded')), environment text not null, created_at timestamptz not null default now());
create table bellix.refunds(id uuid primary key default gen_random_uuid(), payment_id uuid not null references bellix.payments(id), provider_refund_id text unique not null, amount bigint not null check(amount>0), status text not null check(status in ('processed','failed','pending')), created_at timestamptz not null default now());
create table bellix.webhook_events(id uuid primary key default gen_random_uuid(), provider_event_id text unique not null, type text not null, status text not null check(status in ('processed','ignored')), created_at timestamptz not null default now());
create table bellix.billing_periods(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), subscription_id uuid references bellix.subscriptions(id), payment_id uuid not null unique references bellix.payments(id), snapshot jsonb not null, starts_at timestamptz not null, ends_at timestamptz not null, created_at timestamptz not null default now(), check(ends_at>starts_at));
create table bellix.credit_grants(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), tool_id uuid not null references bellix.tools(id), source text not null check(source in ('trial','plan','topup','emergency')), source_reference text not null, granted_units integer not null check(granted_units>0), reserved_units integer not null default 0 check(reserved_units>=0), consumed_units integer not null default 0 check(consumed_units>=0), starts_at timestamptz not null, expires_at timestamptz not null, revoked_at timestamptz, limits jsonb not null, requires_active_plan boolean not null default false, created_at timestamptz not null default now(), check(reserved_units+consumed_units<=granted_units), check(expires_at>starts_at), unique(user_id,tool_id,source,source_reference));
create table bellix.processing_jobs(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), tool_id uuid not null references bellix.tools(id), grant_id uuid not null references bellix.credit_grants(id), request_key uuid not null, status text not null default 'reserved' check(status in ('reserved','processing','completed','failed','timed_out')), execution text not null check(execution in ('browser','server')), metadata jsonb not null, error_code text, created_at timestamptz not null default now(), deadline timestamptz not null default now()+interval '30 minutes', finished_at timestamptz, unique(user_id,request_key));
create table bellix.credit_transactions(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), grant_id uuid not null references bellix.credit_grants(id), job_id uuid references bellix.processing_jobs(id), type text not null check(type in ('grant','reserve','consume','release','revoke')), units integer not null check(units>0), reason text, created_at timestamptz not null default now());
create unique index credit_job_transition on bellix.credit_transactions(job_id,type) where job_id is not null;
create table bellix.contact_messages(id uuid primary key default gen_random_uuid(), user_id uuid references bellix.profiles(id), name text not null check(length(name) between 1 and 160), email text not null check(length(email)<=254), subject text not null check(length(subject) between 1 and 200), message text not null check(length(message) between 10 and 10000), status text not null default 'unread' check(status in ('unread','read','pending','resolved')), internal_notes text not null default '', created_at timestamptz not null default now());
create table bellix.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references bellix.profiles(id), period_key text not null, type text not null check(type in ('expiry_reminder','expired','low_credit','credit_grant')), channel text not null check(channel in ('in_app','email')), body text not null, status text not null default 'pending' check(status in ('pending','sending','delivered','retry','awaiting_setup','suppressed','failed')), attempts integer not null default 0 check(attempts>=0), scheduled_at timestamptz not null default now(), delivered_at timestamptz, lease_until timestamptz, read_at timestamptz, created_at timestamptz not null default now(), unique(user_id,period_key,type,channel));
create table bellix.admin_audit_logs(id uuid primary key default gen_random_uuid(), actor_id uuid references bellix.profiles(id), action text not null, entity text not null, entity_id uuid, reason text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now());
create table bellix.rate_limits(id uuid primary key default gen_random_uuid(), bucket text not null unique, hits integer not null check(hits>0), expires_at timestamptz not null);
create index grants_available on bellix.credit_grants(user_id,tool_id,expires_at);
create index jobs_owner_created on bellix.processing_jobs(user_id,created_at desc);
create index notifications_due on bellix.notifications(status,scheduled_at);
create index contacts_status_created on bellix.contact_messages(status,created_at desc);
create index subscriptions_owner_end on bellix.subscriptions(user_id,current_period_end);
create index orders_owner_created on bellix.orders(user_id,created_at desc);
create index payments_owner_created on bellix.payments(user_id,created_at desc);

create function bellix.has_role(required text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from bellix.user_roles r join bellix.profiles p on p.id=r.user_id where r.user_id=auth.uid() and p.status='active' and (r.role='superadmin' or (required='admin' and r.role='admin')))
$$;
revoke all on function bellix.has_role(text) from public,anon;
grant execute on function bellix.has_role(text) to authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['profiles','user_roles','tools','plans','plan_prices','plan_tool_limits','subscriptions','billing_periods','orders','payments','refunds','webhook_events','credit_grants','credit_transactions','processing_jobs','contact_messages','notifications','site_settings','admin_audit_logs','rate_limits'] loop
 execute format('alter table bellix.%I enable row level security',t);
 execute format('revoke all on bellix.%I from public, anon, authenticated',t);
 execute format('grant all on bellix.%I to service_role',t);
 end loop;
 foreach t in array array['subscriptions','billing_periods','orders','payments','credit_grants','credit_transactions','processing_jobs','notifications'] loop
 execute format('grant select on bellix.%I to authenticated',t);
 execute format('create policy owner_read on bellix.%I for select to authenticated using(user_id=auth.uid())',t);
 end loop;
end $$;
grant select on bellix.profiles,bellix.user_roles to authenticated;
create policy profile_read on bellix.profiles for select to authenticated using(id=auth.uid() or bellix.has_role('admin'));
create policy role_read on bellix.user_roles for select to authenticated using(user_id=auth.uid());
grant select on bellix.contact_messages to authenticated;
create policy support_contact_read on bellix.contact_messages for select to authenticated using(bellix.has_role('admin'));
-- Published pricing is served through a narrowly selected public server endpoint, never drafts.

create function bellix.initialize_account(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare u auth.users; p bellix.profiles; t bellix.tools; settings jsonb; started timestamptz; ending timestamptz; g uuid; units integer;
begin
 select * into u from auth.users where id=p_user;
 if u.id is null or u.email_confirmed_at is null then raise exception 'verified_account_required'; end if;
 insert into bellix.profiles(id,email,name) values(u.id,u.email,left(coalesce(u.raw_user_meta_data->>'name',''),160)) on conflict(id) do nothing;
 select * into p from bellix.profiles where id=p_user for update;
 insert into bellix.user_roles(user_id) values(p_user) on conflict(user_id) do nothing;
 if p.trial_started_at is not null then return; end if;
 select value into settings from bellix.site_settings where key='trial';
 started:=u.email_confirmed_at; ending:=started+make_interval(days=>(settings->>'days')::integer);
 update bellix.profiles set trial_started_at=started,trial_ends_at=ending where id=p_user;
 for t in select * from bellix.tools loop
 units:=coalesce((settings->>t.slug)::integer,0);
 if units>0 then
 insert into bellix.credit_grants(user_id,tool_id,source,source_reference,granted_units,starts_at,expires_at,limits)
 values(p_user,t.id,'trial','once',units,started,ending,to_jsonb(t)) returning id into g;
 insert into bellix.credit_transactions(user_id,grant_id,type,units,reason) values(p_user,g,'grant',units,'Verified account trial');
 end if; end loop;
end $$;
create function bellix.on_verified_user() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.email_confirmed_at is not null then perform bellix.initialize_account(new.id); end if; return new; end $$;
create trigger bellix_verified_account after insert or update of email_confirmed_at on auth.users for each row execute function bellix.on_verified_user();

create function bellix.reserve_job(p_user uuid,p_tool text,p_request uuid,p_metadata jsonb,p_execution text) returns bellix.processing_jobs language plpgsql security definer set search_path='' as $$
declare g bellix.credit_grants; t bellix.tools; j bellix.processing_jobs; n text; limit_value numeric; actual numeric;
begin
 perform bellix.initialize_account(p_user);
 perform 1 from bellix.profiles where id=p_user and status='active' for update;
 if not found then raise exception 'account_unavailable'; end if;
 select * into j from bellix.processing_jobs where user_id=p_user and request_key=p_request;
 if found then if j.tool_id<>(select id from bellix.tools where slug=p_tool) or j.metadata<>p_metadata then raise exception 'idempotency_conflict'; end if; return j; end if;
 select * into t from bellix.tools where slug=p_tool and enabled;
 if not found then raise exception 'tool_unavailable'; end if;
 if p_execution not in ('browser','server') then raise exception 'invalid_execution'; end if;
 if p_execution='browser' and t.execution<>'browser' then raise exception 'server_processing_required'; end if;
 if coalesce((p_metadata->>'bytes')::numeric,0)<=0 or (p_metadata->>'bytes')::numeric>t.max_bytes then raise exception 'file_limit'; end if;
 if p_tool='video-watermark-remover' and (coalesce((p_metadata->>'duration_seconds')::numeric,0)<=0 or coalesce((p_metadata->>'width')::numeric,0)<=0 or coalesce((p_metadata->>'height')::numeric,0)<=0) then raise exception 'video_metadata_required'; end if;
 for g in select * from bellix.credit_grants where user_id=p_user and tool_id=t.id and revoked_at is null and starts_at<=now() and expires_at>now() and granted_units-reserved_units-consumed_units>0
 and (not requires_active_plan or exists(select 1 from bellix.subscriptions s where s.user_id=p_user and s.status in ('active','cancelled') and s.current_period_start<=now() and s.current_period_end>now())) order by expires_at,id for update loop
 for n in select unnest(array['bytes','duration_seconds','width','height']) loop
 limit_value:=case n when 'bytes' then least(t.max_bytes,(g.limits->>'max_bytes')::numeric) when 'duration_seconds' then least(t.max_duration_seconds,(g.limits->>'max_duration_seconds')::numeric) when 'width' then least(t.max_width,(g.limits->>'max_width')::numeric) else least(t.max_height,(g.limits->>'max_height')::numeric) end;
 actual:=(p_metadata->>n)::numeric;
 if limit_value is not null and (actual is null or actual>limit_value) then raise exception 'file_limit_%',n; end if;
 end loop;
 update bellix.credit_grants set reserved_units=reserved_units+1 where id=g.id;
 insert into bellix.processing_jobs(user_id,tool_id,grant_id,request_key,metadata,execution) values(p_user,t.id,g.id,p_request,p_metadata,p_execution) returning * into j;
 insert into bellix.credit_transactions(user_id,grant_id,job_id,type,units) values(p_user,g.id,j.id,'reserve',1);
 return j;
 end loop;
 raise exception 'credits_unavailable';
end $$;

create function bellix.settle_job(p_job uuid,p_success boolean,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare j bellix.processing_jobs; success boolean;
begin
 select * into j from bellix.processing_jobs where id=p_job for update;
 if not found then raise exception 'job_not_found'; end if;
 if j.status not in ('reserved','processing') then return; end if;
 success:=p_success and now()<=j.deadline;
 update bellix.credit_grants set reserved_units=reserved_units-1,consumed_units=consumed_units+case when success then 1 else 0 end where id=j.grant_id;
 update bellix.processing_jobs set status=case when success then 'completed' when now()>j.deadline then 'timed_out' else 'failed' end,finished_at=now(),error_code=case when success then null else left(coalesce(p_error,'processing_failed'),80) end where id=j.id;
 insert into bellix.credit_transactions(user_id,grant_id,job_id,type,units) values(j.user_id,j.grant_id,j.id,case when success then 'consume' else 'release' end,1);
end $$;

create function bellix.rate_limit(p_bucket text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$ declare h integer; begin
 insert into bellix.rate_limits(bucket,hits,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds)) on conflict(bucket) do update set hits=case when bellix.rate_limits.expires_at<=now() then 1 else bellix.rate_limits.hits+1 end,expires_at=case when bellix.rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else bellix.rate_limits.expires_at end returning hits into h;
 return h<=p_max;
end $$;

-- None of the mutation functions accepts an end-user-supplied role as authority.
revoke all on all functions in schema bellix from public,anon,authenticated;
grant execute on function bellix.has_role(text) to authenticated;
grant execute on all functions in schema bellix to service_role;


-- SOURCE: 202611180002_billing_admin.sql

create function bellix.admin_mutate(p_actor uuid,p_action text,p_data jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare role_name text; result jsonb; target uuid; g uuid; t bellix.tools; item jsonb; plan uuid; version_number integer; family uuid; old_data jsonb; ending timestamptz;
begin
 select r.role into role_name from bellix.user_roles r join bellix.profiles p on p.id=r.user_id where r.user_id=p_actor and p.status='active';
 if role_name not in ('admin','superadmin') or role_name is null then raise exception 'forbidden'; end if;
 if length(trim(p_reason))<3 then raise exception 'reason_required'; end if;
 if p_action<>'contact' and role_name<>'superadmin' then raise exception 'superadmin_required'; end if;
 target:=nullif(p_data->>'id','')::uuid;
 if p_action='contact' then
 select to_jsonb(c) into old_data from bellix.contact_messages c where id=target for update;
 update bellix.contact_messages set status=p_data->>'status',internal_notes=left(coalesce(p_data->>'internal_notes',''),10000) where id=target returning to_jsonb(contact_messages.*) into result;
 elsif p_action='user' then
 select to_jsonb(p) into old_data from bellix.profiles p where id=target for update;
 if target=p_actor and p_data->>'status'<>'active' then raise exception 'cannot_suspend_self'; end if;
 update bellix.profiles set status=p_data->>'status' where id=target returning to_jsonb(profiles.*) into result;
 elsif p_action='role' then
 if p_data->>'role'='superadmin' then raise exception 'use_controlled_bootstrap_for_superadmin'; end if;
 if target=p_actor then raise exception 'cannot_change_own_role'; end if;
 select to_jsonb(r) into old_data from bellix.user_roles r where user_id=target for update;
 if old_data->>'role'='superadmin' then raise exception 'cannot_demote_superadmin'; end if;
 update bellix.user_roles set role=p_data->>'role' where user_id=target returning to_jsonb(user_roles.*) into result;
 elsif p_action='grant' then
 select * into t from bellix.tools where slug=p_data->>'tool';
 ending:=(p_data->>'expires_at')::timestamptz;
 if coalesce((p_data->>'units')::integer,0)<=0 or ending<=now() or ending>now()+interval '1 year' then raise exception 'invalid_grant'; end if;
 insert into bellix.credit_grants(user_id,tool_id,source,source_reference,granted_units,starts_at,expires_at,limits) values(target,t.id,'emergency',(p_data->>'request_key')::uuid::text,(p_data->>'units')::integer,now(),ending,to_jsonb(t)) returning id into g;
 insert into bellix.credit_transactions(user_id,grant_id,type,units,reason) values(target,g,'grant',(p_data->>'units')::integer,p_reason);
 insert into bellix.notifications(user_id,period_key,type,channel,body,status,delivered_at) values(target,g::text,'credit_grant','in_app',format('You received %s %s credits, valid until %s UTC. Reason: %s',p_data->>'units',t.name,ending,p_reason),'delivered',now());
 result:=jsonb_build_object('id',g);
 elsif p_action='trial' then
 if (p_data->>'days')::integer not between 1 and 365 then raise exception 'invalid_trial_days'; end if;
 for t in select * from bellix.tools loop if (p_data->>t.slug)::integer not between 0 and 100 then raise exception 'invalid_trial_units'; end if; end loop;
 select value into old_data from bellix.site_settings where key='trial' for update;
 update bellix.site_settings set value=p_data,updated_at=now() where key='trial' returning value into result;
 elsif p_action='settings' then
 select value into old_data from bellix.site_settings where key='website' for update;
 update bellix.site_settings set value=p_data,updated_at=now() where key='website' returning value into result;
 elsif p_action='tool' then
 select to_jsonb(x) into old_data from bellix.tools x where id=target for update;
 update bellix.tools set enabled=(p_data->>'enabled')::boolean,max_bytes=(p_data->>'max_bytes')::bigint,max_duration_seconds=nullif(p_data->>'max_duration_seconds','')::numeric,max_width=nullif(p_data->>'max_width','')::integer,max_height=nullif(p_data->>'max_height','')::integer where id=target returning to_jsonb(tools.*) into result;
 elsif p_action='plan_status' then
 if p_data->>'status'='published' then
 if exists(select 1 from bellix.plan_tool_limits l join bellix.tools tool_record on tool_record.id=l.tool_id where l.plan_id=target and l.units>0 and tool_record.execution='browser') then raise exception 'browser_paid_processing_not_supported'; end if;
 perform 1 from bellix.plans p join bellix.plan_prices pp on pp.plan_id=p.id where p.id=target and pp.amount>0 and pp.currency is not null and ((p.kind='plan' and pp.interval is not null) or (p.kind='topup' and p.validity_days>0)) and exists(select 1 from bellix.plan_tool_limits l where l.plan_id=p.id and l.units>0);
 if not found then raise exception 'incomplete_plan'; end if;
 end if;
 select to_jsonb(p) into old_data from bellix.plans p where id=target for update;
 update bellix.plans set status=p_data->>'status' where id=target returning to_jsonb(plans.*) into result;
 elsif p_action='plan' then
 family:=coalesce(nullif(p_data->>'family_id','')::uuid,gen_random_uuid());
 perform pg_advisory_xact_lock(hashtextextended(family::text,0));
 select coalesce(max(version),0)+1 into version_number from bellix.plans where family_id=family;
 insert into bellix.plans(family_id,version,name,description,kind,validity_days,requires_active_plan) values(family,version_number,p_data->>'name',coalesce(p_data->>'description',''),coalesce(p_data->>'kind','plan'),nullif(p_data->>'validity_days','')::integer,coalesce((p_data->>'requires_active_plan')::boolean,false)) returning id into plan;
 insert into bellix.plan_prices(plan_id,amount,currency,interval) values(plan,nullif(p_data->>'amount','')::bigint,nullif(p_data->>'currency',''),nullif(p_data->>'interval',''));
 for item in select * from jsonb_array_elements(coalesce(p_data->'limits','[]'::jsonb)) loop
 select * into t from bellix.tools where slug=item->>'tool';
 insert into bellix.plan_tool_limits(plan_id,tool_id,units,max_bytes,max_duration_seconds,max_width,max_height) values(plan,t.id,(item->>'units')::integer,coalesce((item->>'max_bytes')::bigint,t.max_bytes),coalesce((item->>'max_duration_seconds')::numeric,t.max_duration_seconds),coalesce((item->>'max_width')::integer,t.max_width),coalesce((item->>'max_height')::integer,t.max_height));
 end loop;
 result:=jsonb_build_object('id',plan,'version',version_number,'status','draft');
 else raise exception 'unsupported_action'; end if;
 if result is null then raise exception 'record_not_found'; end if;
 insert into bellix.admin_audit_logs(actor_id,action,entity,entity_id,reason,before_data,after_data) values(p_actor,p_action,p_action,target,p_reason,old_data,result);
 return result;
end $$;

create function bellix.create_order(p_user uuid,p_plan uuid,p_request uuid,p_environment text) returns bellix.orders language plpgsql security definer set search_path='' as $$
declare p bellix.plans; price bellix.plan_prices; o bellix.orders; snapshot jsonb;
begin
 perform bellix.initialize_account(p_user);
 perform 1 from bellix.profiles where id=p_user and status='active' for update;
 if not found then raise exception 'account_unavailable'; end if;
 select * into o from bellix.orders where user_id=p_user and request_key=p_request;
 if found then if o.plan_id<>p_plan then raise exception 'idempotency_conflict'; end if; return o; end if;
 select * into p from bellix.plans where id=p_plan and status='published';
 if not found then raise exception 'plan_unavailable'; end if;
 select * into price from bellix.plan_prices where plan_id=p.id;
 if price.amount is null or price.currency is null then raise exception 'incomplete_price'; end if;
 if p.requires_active_plan and not exists(select 1 from bellix.subscriptions where user_id=p_user and status in ('active','cancelled') and current_period_start<=now() and current_period_end>now()) then raise exception 'active_plan_required'; end if;
 select to_jsonb(p)||jsonb_build_object('price',to_jsonb(price),'limits',coalesce(jsonb_agg(to_jsonb(l)) filter(where l.id is not null),'[]'::jsonb)) into snapshot from bellix.plan_tool_limits l where l.plan_id=p.id;
 insert into bellix.orders(user_id,plan_id,request_key,snapshot,amount,currency,environment) values(p_user,p.id,p_request,snapshot,price.amount,price.currency,p_environment) returning * into o;
 return o;
end $$;

create function bellix.fulfill_payment(p_provider_order text,p_payment text,p_amount bigint,p_currency text,p_environment text,p_event text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare o bellix.orders; pay uuid; s uuid; period uuid; start_at timestamptz; end_at timestamptz; l jsonb; g uuid;
begin
 select * into o from bellix.orders where provider_order_id=p_provider_order for update;
 if not found then raise exception 'order_not_found'; end if;
 if o.amount<>p_amount or o.currency<>p_currency or o.environment<>p_environment then raise exception 'payment_mismatch'; end if;
 select id into pay from bellix.payments where provider_payment_id=p_payment;
 if found then
 if not exists(select 1 from bellix.payments where id=pay and order_id=o.id) then raise exception 'payment_order_mismatch'; end if;
 return pay; end if;
 if o.status in ('paid','refunded') then raise exception 'order_already_settled'; end if;
 perform 1 from bellix.profiles where id=o.user_id for update;
 insert into bellix.payments(order_id,user_id,provider_payment_id,amount,currency,status,environment) values(o.id,o.user_id,p_payment,p_amount,p_currency,'captured',p_environment) returning id into pay;
 start_at:=now();
 if o.snapshot->>'kind'='plan' then
 select greatest(now(),coalesce(max(current_period_end),now())) into start_at from bellix.subscriptions where user_id=o.user_id and status in ('active','cancelled');
 end_at:=case o.snapshot->'price'->>'interval' when 'weekly' then start_at+interval '1 week' when 'monthly' then start_at+interval '1 month' end;
 if end_at is null then raise exception 'invalid_interval'; end if;
 insert into bellix.subscriptions(user_id,plan_id,status,current_period_start,current_period_end) values(o.user_id,o.plan_id,'active',start_at,end_at) returning id into s;
 else end_at:=start_at+make_interval(days=>(o.snapshot->>'validity_days')::integer); end if;
 insert into bellix.billing_periods(user_id,subscription_id,payment_id,snapshot,starts_at,ends_at) values(o.user_id,s,pay,o.snapshot,start_at,end_at) returning id into period;
 for l in select * from jsonb_array_elements(o.snapshot->'limits') loop
 if (l->>'units')::integer>0 then
 insert into bellix.credit_grants(user_id,tool_id,source,source_reference,granted_units,starts_at,expires_at,limits,requires_active_plan) values(o.user_id,(l->>'tool_id')::uuid,case when s is null then 'topup' else 'plan' end,period::text,(l->>'units')::integer,start_at,end_at,l,coalesce((o.snapshot->>'requires_active_plan')::boolean,false)) returning id into g;
 insert into bellix.credit_transactions(user_id,grant_id,type,units,reason) values(o.user_id,g,'grant',(l->>'units')::integer,'Verified captured payment');
 end if; end loop;
 update bellix.orders set status='paid' where id=o.id;
 if p_event is not null then insert into bellix.webhook_events(provider_event_id,type,status) values(p_event,'payment.captured','processed') on conflict do nothing; end if;
 return pay;
end $$;

create function bellix.record_refund(p_payment text,p_refund text,p_amount bigint,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare p bellix.payments; total bigint; g bellix.credit_grants;
begin
 select * into p from bellix.payments where provider_payment_id=p_payment for update;
 if not found then raise exception 'payment_not_found'; end if;
 if exists(select 1 from bellix.refunds where provider_refund_id=p_refund and status='processed') then return; end if;
 insert into bellix.refunds(payment_id,provider_refund_id,amount,status) values(p.id,p_refund,p_amount,p_status) on conflict(provider_refund_id) do update set status=excluded.status;
 select coalesce(sum(amount),0) into total from bellix.refunds where payment_id=p.id and status='processed';
 if total>p.amount then raise exception 'refund_exceeds_payment'; end if;
 if total>0 then
 update bellix.payments set status=case when total=p.amount then 'refunded' else 'partially_refunded' end where id=p.id;
 -- Conservative policy: any confirmed refund revokes remaining grants for this purchase.
 for g in select cg.* from bellix.credit_grants cg join bellix.billing_periods b on b.id::text=cg.source_reference where b.payment_id=p.id and cg.revoked_at is null for update of cg loop
 update bellix.credit_grants set revoked_at=now() where id=g.id;
 insert into bellix.credit_transactions(user_id,grant_id,type,units,reason) values(g.user_id,g.id,'revoke',g.granted_units,'Confirmed refund; remaining benefits revoked');
 end loop;
 update bellix.orders set status='refunded' where id=p.order_id;
 update bellix.subscriptions set status='cancelled' where id in(select subscription_id from bellix.billing_periods where payment_id=p.id);
 end if;
end $$;

create function bellix.dashboard() returns jsonb language sql security definer set search_path='' as $$ select jsonb_build_object(
 'users',(select count(*) from bellix.profiles),'successful_payments',(select count(*) from bellix.payments),'active_plans',(select count(*) from bellix.subscriptions where status in ('active','cancelled') and current_period_start<=now() and current_period_end>now()),'failed_processing',(select count(*) from bellix.processing_jobs where status in ('failed','timed_out')),'new_contact_messages',(select count(*) from bellix.contact_messages where status='unread'),
 'revenue_by_currency',coalesce((select jsonb_agg(x) from(select currency,environment,sum(amount) gross_minor_units,(select coalesce(sum(r.amount),0) from bellix.refunds r join bellix.payments rp on rp.id=r.payment_id where rp.currency=p.currency and rp.environment=p.environment and r.status='processed') refunded_minor_units from bellix.payments p group by currency,environment)x),'[]'::jsonb)) $$;

revoke all on all functions in schema bellix from public,anon,authenticated;
grant execute on function bellix.has_role(text) to authenticated;
grant execute on all functions in schema bellix to service_role;
-- Close legacy browser mutation paths without deleting historical records.
do $$ declare t text; f record; begin
 foreach t in array array['users','plans','subscriptions','credit_ledger','jobs','payments','admin_users','settings','audit_logs','tickets','ticket_messages','api_keys','webhooks'] loop
 if to_regclass('public.'||t) is not null then execute format('revoke all on public.%I from anon,authenticated',t); end if;
 end loop;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('deduct_user_credits','add_user_credits','reset_daily_credits') loop execute format('revoke execute on function %s from public,anon,authenticated',f.signature); end loop;
end $$;


-- SOURCE: 202611180003_notifications.sql

create function bellix.notification_current(n bellix.notifications) returns boolean language sql stable set search_path='' as $$
 select case when n.type in ('credit_grant','low_credit') then exists(select 1 from bellix.credit_grants where id::text=n.period_key and user_id=n.user_id and expires_at>now() and revoked_at is null)
 when n.period_key like 'trial:%' then exists(select 1 from bellix.profiles p where p.id=n.user_id and p.status='active' and ((n.type='expired' and p.trial_ends_at<=now()) or (n.type='expiry_reminder' and p.trial_ends_at>now() and p.trial_ends_at<=now()+interval '4 days')) and not exists(select 1 from bellix.subscriptions s where s.user_id=p.id and s.current_period_end>now() and s.status in ('active','cancelled')))
 else exists(select 1 from bellix.subscriptions s where s.id::text=n.period_key and s.user_id=n.user_id and ((n.type='expired' and s.current_period_end<=now() and not exists(select 1 from bellix.subscriptions newer where newer.user_id=s.user_id and newer.current_period_end>s.current_period_end and newer.status in ('active','cancelled'))) or (n.type='expiry_reminder' and s.status in ('active','cancelled') and s.current_period_end>now() and s.current_period_end<=now()+interval '4 days'))) end
$$;
create function bellix.maintenance() returns integer language plpgsql security definer set search_path='' as $$
declare j record; p record; channel_name text; kind text; message text; affected integer:=0;
begin
 for j in select id from bellix.processing_jobs where status in ('reserved','processing') and deadline<now() loop perform bellix.settle_job(j.id,false,'timeout'); end loop;
 update bellix.subscriptions set status='expired' where current_period_end<=now() and status in ('active','cancelled');
 for p in select id user_id,('trial:'||id::text) period_key,trial_ends_at ends_at,'trial' period_type from bellix.profiles where status='active' and trial_ends_at<=now()+interval '4 days'
 union all select user_id,id::text,current_period_end,'plan' from bellix.subscriptions where current_period_end<=now()+interval '4 days' loop
 kind:=case when p.ends_at<=now() then 'expired' else 'expiry_reminder' end;
 message:=case when kind='expired' then format('Your Bellix %s expired on %s UTC. Renew your plan to continue using your tools.',p.period_type,p.ends_at) else format('Your Bellix %s expires on %s UTC. Renew your plan to continue using your tools.',p.period_type,p.ends_at) end;
 foreach channel_name in array array['in_app','email'] loop
 insert into bellix.notifications(user_id,period_key,type,channel,body) values(p.user_id,p.period_key,kind,channel_name,message) on conflict do nothing;
 end loop; end loop;
 for p in select user_id,id::text period_key from bellix.credit_grants where starts_at<=now() and expires_at>now() and revoked_at is null and granted_units-reserved_units-consumed_units<=1 loop
 insert into bellix.notifications(user_id,period_key,type,channel,body) values(p.user_id,p.period_key,'low_credit','in_app','Your tool credits are running low. Review usage or renew from your account.') on conflict do nothing;
 end loop;
 update bellix.notifications n set status='suppressed' where status in ('pending','retry','awaiting_setup') and not bellix.notification_current(n);
 update bellix.notifications set status='delivered',delivered_at=now() where channel='in_app' and status='pending';
 delete from bellix.rate_limits where expires_at<now()-interval '1 day';
 get diagnostics affected=row_count; return affected;
end $$;
create function bellix.claim_emails(p_enabled boolean) returns setof bellix.notifications language plpgsql security definer set search_path='' as $$ begin
 update bellix.notifications n set status='suppressed' where channel='email' and status in ('pending','retry','awaiting_setup') and not bellix.notification_current(n);
 if not p_enabled then update bellix.notifications set status='awaiting_setup' where channel='email' and status in ('pending','retry'); return; end if;
 return query update bellix.notifications set status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes' where id in(select id from bellix.notifications where channel='email' and attempts<5 and scheduled_at<=now() and (status in ('pending','retry','awaiting_setup') or (status='sending' and lease_until<now())) order by scheduled_at for update skip locked limit 25) returning *;
end $$;
revoke all on all functions in schema bellix from public,anon,authenticated;
grant execute on function bellix.has_role(text) to authenticated;
grant execute on all functions in schema bellix to service_role;


-- SOURCE: 202611180004_bootstrap.sql

create function bellix.bootstrap_superadmin(p_user uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(hashtextextended('bellix_first_superadmin',0));
 if exists(select 1 from bellix.user_roles where role='superadmin') then raise exception 'superadmin_already_exists'; end if;
 if length(trim(p_reason))<10 then raise exception 'reason_required'; end if;
 perform bellix.initialize_account(p_user);
 update bellix.user_roles set role='superadmin' where user_id=p_user;
 insert into bellix.admin_audit_logs(actor_id,action,entity,entity_id,reason) values(p_user,'bootstrap','user_roles',p_user,p_reason);
end $$;
revoke all on function bellix.bootstrap_superadmin(uuid,text) from public,anon,authenticated;
grant execute on function bellix.bootstrap_superadmin(uuid,text) to service_role;


-- SOURCE: 202611180005_delivery.sql

alter table bellix.notifications drop constraint notifications_status_check;
alter table bellix.notifications add constraint notifications_status_check check(status in ('pending','sending','accepted','delivered','retry','awaiting_setup','suppressed','failed'));
alter table bellix.notifications add column provider_message_id text unique;


-- SOURCE: 202611180006_atomic_reconciliation.sql

create function bellix.fulfill_with_refunds(p_provider_order text,p_payment text,p_amount bigint,p_currency text,p_environment text,p_refunds jsonb,p_event text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; r jsonb;
begin
 result:=bellix.fulfill_payment(p_provider_order,p_payment,p_amount,p_currency,p_environment,p_event);
 for r in select * from jsonb_array_elements(p_refunds) loop
 perform bellix.record_refund(p_payment,r->>'id',(r->>'amount')::bigint,r->>'status');
 end loop;
 return result;
end $$;
revoke all on function bellix.fulfill_with_refunds(text,text,bigint,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function bellix.fulfill_with_refunds(text,text,bigint,text,text,jsonb,text) to service_role;


-- SOURCE: 202611180007_team_access.sql

create function bellix.team_access(p_actor uuid,p_email text,p_role text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not exists(select 1 from bellix.user_roles r join bellix.profiles p on p.id=r.user_id where r.user_id=p_actor and r.role='superadmin' and p.status='active') then raise exception 'forbidden'; end if;
 if p_role not in ('user','admin') then raise exception 'invalid_role'; end if;
 select p.id into target from bellix.profiles p join auth.users u on u.id=p.id where lower(p.email)=lower(trim(p_email)) and u.email_confirmed_at is not null and p.status='active';
 if target is null then raise exception 'verified_account_required'; end if;
 return bellix.admin_mutate(p_actor,'role',jsonb_build_object('id',target,'role',p_role),p_reason);
end $$;
revoke all on function bellix.team_access(uuid,text,text,text) from public,anon,authenticated;
grant execute on function bellix.team_access(uuid,text,text,text) to service_role;


-- SOURCE: 202611180008_recurring.sql

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


-- SOURCE: 202611180009_recurring_reminders.sql

alter function bellix.maintenance() rename to maintenance_base;
create function bellix.maintenance() returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 affected:=bellix.maintenance_base();
 update bellix.notifications n set body=format('Your Bellix plan is scheduled to renew on %s UTC. Review your billing and renewal status in your account.',s.current_period_end)
 from bellix.subscriptions s join bellix.recurring_contracts c on c.id=s.recurring_contract_id
 where n.period_key=s.id::text and n.type='expiry_reminder' and s.renewal_mode='automatic' and not c.cancel_at_period_end and c.status in ('active','authenticated');
 insert into bellix.notifications(user_id,period_key,type,channel,body)
 select user_id,period_key,type,'email',body from bellix.notifications where type='low_credit' and channel='in_app' and status='delivered'
 on conflict do nothing;
 return affected;
end $$;
revoke all on function bellix.maintenance(),bellix.maintenance_base() from public,anon,authenticated;
grant execute on function bellix.maintenance(),bellix.maintenance_base() to service_role;


commit;

-- Verify tables were created. This does not create or grant any public admin account.
select table_name from information_schema.tables where table_schema='bellix' order by table_name;
