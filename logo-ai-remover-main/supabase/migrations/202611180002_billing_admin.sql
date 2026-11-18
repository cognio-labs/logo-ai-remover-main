begin;
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
commit;
