begin;
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
commit;
