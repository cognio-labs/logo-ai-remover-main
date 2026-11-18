begin;
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
commit;
