-- Review against a schema-only production dump before applying. No legacy data is deleted.
begin;
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
commit;
