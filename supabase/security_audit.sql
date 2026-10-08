-- Read-only production verification. Every exposed table/view below must deny anon/authenticated.
select object, role, has_table_privilege(role, object, 'SELECT') as can_read,
    has_table_privilege(role, object, 'INSERT') as can_insert, has_table_privilege(role, object, 'UPDATE') as can_update,
    has_table_privilege(role, object, 'DELETE') as can_delete
from unnest(array['public.messages','public.otp_messages','public.bank_activity','public.webhook_logs','public.all_messages','public.dashboard_sessions','public.login_attempts','public.message_receipts','public.export_jobs','public.export_snapshots','public.maintenance_runs']) object
cross join unnest(array['anon','authenticated']) role;
-- Review any legacy SECURITY DEFINER RPCs separately: they can bypass RLS even after table privileges are revoked.
select n.nspname,p.proname,pg_get_userbyid(p.proowner) as owner,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef;
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('messages','otp_messages','bank_activity','webhook_logs','dashboard_sessions','login_attempts');
