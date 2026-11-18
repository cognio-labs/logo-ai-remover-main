begin;
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
commit;
