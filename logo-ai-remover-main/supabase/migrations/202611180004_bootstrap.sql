begin;
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
commit;
