begin;
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
