-- Upgrade an existing SMS Sync Pro database for authenticated Realtime INSERT events.
-- Safe to run repeatedly. The browser still needs a server-issued JWT with dashboard_access=true.
begin;

grant select on public.messages,public.otp_messages,public.bank_activity,public.webhook_logs to authenticated;

drop policy if exists dashboard_realtime_read on public.messages;
drop policy if exists dashboard_realtime_read on public.otp_messages;
drop policy if exists dashboard_realtime_read on public.bank_activity;
drop policy if exists dashboard_realtime_read on public.webhook_logs;

create policy dashboard_realtime_read on public.messages for select to authenticated
    using ((select auth.jwt()->>'dashboard_access')='true');
create policy dashboard_realtime_read on public.otp_messages for select to authenticated
    using ((select auth.jwt()->>'dashboard_access')='true');
create policy dashboard_realtime_read on public.bank_activity for select to authenticated
    using ((select auth.jwt()->>'dashboard_access')='true');
create policy dashboard_realtime_read on public.webhook_logs for select to authenticated
    using ((select auth.jwt()->>'dashboard_access')='true');

do $$
declare table_name text;
begin
    foreach table_name in array array['messages','otp_messages','bank_activity','webhook_logs'] loop
        if not exists (
            select 1 from pg_catalog.pg_publication_tables
            where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
        ) then
            execute format('alter publication supabase_realtime add table public.%I',table_name);
        end if;
    end loop;
end;
$$;

commit;
