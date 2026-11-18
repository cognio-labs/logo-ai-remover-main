begin;
alter table bellix.notifications drop constraint notifications_status_check;
alter table bellix.notifications add constraint notifications_status_check check(status in ('pending','sending','accepted','delivered','retry','awaiting_setup','suppressed','failed'));
alter table bellix.notifications add column provider_message_id text unique;
commit;
