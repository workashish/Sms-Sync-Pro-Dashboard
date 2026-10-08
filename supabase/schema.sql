begin;
-- Review and run in the Supabase SQL editor before deploying this version.
-- Existing tables are preserved. No messages are deleted.
create table if not exists public.messages (
    id uuid primary key, sender text not null, body text not null, time text not null,
    metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.otp_messages (like public.messages including all);
create table if not exists public.bank_activity (like public.messages including all);
create table if not exists public.webhook_logs (
    id uuid primary key, payload jsonb, status text not null, error text,
    created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
alter table public.otp_messages enable row level security;
alter table public.bank_activity enable row level security;
alter table public.webhook_logs enable row level security;
-- Revoking privileges also blocks any old permissive anonymous policies.
revoke all on public.messages, public.otp_messages, public.bank_activity, public.webhook_logs from public, anon, authenticated;
grant select, insert, update, delete on public.messages, public.otp_messages, public.bank_activity, public.webhook_logs to service_role;
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists otp_messages_created_at_idx on public.otp_messages(created_at desc);
create index if not exists bank_activity_created_at_idx on public.bank_activity(created_at desc);
create index if not exists webhook_logs_created_at_idx on public.webhook_logs(created_at desc);
-- Patch one flag atomically without overwriting concurrent updates to other metadata.
create or replace function public.set_message_flag(target_table text, target_id uuid, flag text, flag_value boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
    if target_table not in ('messages', 'otp_messages', 'bank_activity') or flag not in ('is_unread', 'is_reminder') then
        raise exception 'Invalid target';
    end if;
    execute format('update public.%I set metadata = jsonb_set(coalesce(metadata, ''{}''::jsonb), array[$1], to_jsonb($2), true) where id = $3', target_table)
        using flag, flag_value, target_id;
    get diagnostics affected = row_count;
    if affected = 0 then raise exception 'Message not found'; end if;
end;
$$;
revoke all on function public.set_message_flag(text, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_message_flag(text, uuid, text, boolean) to service_role;

create table if not exists public.dashboard_sessions (
    id uuid primary key, expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.login_attempts (scope text primary key, hits integer not null, window_start timestamptz not null);
alter table public.dashboard_sessions enable row level security;
alter table public.login_attempts enable row level security;
revoke all on public.dashboard_sessions, public.login_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.dashboard_sessions, public.login_attempts to service_role;
create or replace function public.consume_login_attempt(client_scope text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare client_hits integer; global_hits integer;
begin
    -- All instances share these atomic counters. Never trust client-controlled headers unless the ingress overwrites them.
    insert into public.login_attempts values ('global', 1, now()) on conflict (scope) do update
        set hits = case when public.login_attempts.window_start < now() - interval '15 minutes' then 1 else public.login_attempts.hits + 1 end,
        window_start = case when public.login_attempts.window_start < now() - interval '15 minutes' then now() else public.login_attempts.window_start end
        returning hits into global_hits;
    insert into public.login_attempts values (client_scope, 1, now()) on conflict (scope) do update
        set hits = case when public.login_attempts.window_start < now() - interval '15 minutes' then 1 else public.login_attempts.hits + 1 end,
        window_start = case when public.login_attempts.window_start < now() - interval '15 minutes' then now() else public.login_attempts.window_start end
        returning hits into client_hits;
    delete from public.login_attempts where window_start < now() - interval '1 day';
    delete from public.dashboard_sessions where expires_at < now() - interval '1 day';
    return client_hits <= 10 and global_hits <= 1000;
end;
$$;
create or replace function public.ingest_messages(entries jsonb, audit_payload jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; count integer := 0;
begin
    if jsonb_typeof(entries) != 'array' or jsonb_array_length(entries) not between 1 and 100 then raise exception 'Invalid batch'; end if;
    for item in select value from jsonb_array_elements(entries) loop
        if item->>'table' not in ('messages', 'otp_messages', 'bank_activity') then raise exception 'Invalid table'; end if;
        execute format('insert into public.%I (id,sender,body,time,metadata) values ($1,$2,$3,$4,$5) on conflict(id) do nothing', item->>'table')
            using (item->'row'->>'id')::uuid, item->'row'->>'sender', item->'row'->>'body', item->'row'->>'time', item->'row'->'metadata';
        count := count + 1;
    end loop;
    insert into public.webhook_logs(id,payload,status) values (gen_random_uuid(),audit_payload,'success');
    -- Default retention is 30 days, enforced even when no external cron exists.
    delete from public.messages where created_at < now() - interval '30 days';
    delete from public.otp_messages where created_at < now() - interval '30 days';
    delete from public.bank_activity where created_at < now() - interval '30 days';
    delete from public.webhook_logs where created_at < now() - interval '30 days';
    return count;
end;
$$;
create or replace function public.purge_dashboard() returns void language plpgsql security invoker set search_path = '' as $$
begin
    delete from public.messages; delete from public.otp_messages; delete from public.bank_activity; delete from public.webhook_logs; delete from public.export_snapshots; delete from public.export_jobs;
end;
$$;
revoke all on function public.consume_login_attempt(text), public.ingest_messages(jsonb,jsonb), public.purge_dashboard() from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text), public.ingest_messages(jsonb,jsonb), public.purge_dashboard() to service_role;

alter table public.messages add column if not exists received_at timestamptz;
alter table public.otp_messages add column if not exists received_at timestamptz;
alter table public.bank_activity add column if not exists received_at timestamptz;
update public.messages set received_at = created_at where received_at is null;
update public.otp_messages set received_at = created_at where received_at is null;
update public.bank_activity set received_at = created_at where received_at is null;
create or replace view public.all_messages with (security_invoker = true) as
    select id,sender,body,time,received_at,metadata,created_at,'messages'::text as _table from public.messages
    union all select id,sender,body,time,received_at,metadata,created_at,'otp_messages'::text from public.otp_messages
    union all select id,sender,body,time,received_at,metadata,created_at,'bank_activity'::text from public.bank_activity;
revoke all on public.all_messages from public,anon,authenticated;
grant select on public.all_messages to service_role;
create index if not exists messages_received_at_idx on public.messages(received_at desc, id);
create index if not exists otp_messages_received_at_idx on public.otp_messages(received_at desc, id);
create index if not exists bank_activity_received_at_idx on public.bank_activity(received_at desc, id);
create or replace function public.ingest_messages(entries jsonb, audit_payload jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; count integer := 0;
begin
    if jsonb_typeof(entries) != 'array' or jsonb_array_length(entries) not between 1 and 100 then raise exception 'Invalid batch'; end if;
    for item in select value from jsonb_array_elements(entries) loop
        if item->>'table' not in ('messages', 'otp_messages', 'bank_activity') then raise exception 'Invalid table'; end if;
        execute format('insert into public.%I (id,sender,body,time,received_at,metadata) values ($1,$2,$3,$4,$5,$6) on conflict(id) do nothing', item->>'table')
            using (item->'row'->>'id')::uuid, item->'row'->>'sender', item->'row'->>'body', item->'row'->>'time', (item->'row'->>'received_at')::timestamptz, item->'row'->'metadata';
        count := count + 1;
    end loop;
    insert into public.webhook_logs(id,payload,status) values (gen_random_uuid(),audit_payload,'success');
    delete from public.messages where created_at < now() - interval '30 days';
    delete from public.otp_messages where created_at < now() - interval '30 days';
    delete from public.bank_activity where created_at < now() - interval '30 days';
    delete from public.webhook_logs where created_at < now() - interval '30 days';
    return count;
end;
$$;
create or replace function public.dashboard_analytics(zone text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
    if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Invalid timezone'; end if;
    select jsonb_build_object(
        'counts', jsonb_build_object('messages',(select count(*) from public.messages),'otp',(select count(*) from public.otp_messages),'bank',(select count(*) from public.bank_activity)),
        'days', (select jsonb_agg(row_to_json(day_rows) order by date) from (
            select date::date::text as date,
                count(*) filter(where m._table='messages') as messages,
                count(*) filter(where m._table='otp_messages') as otp,
                count(*) filter(where m._table='bank_activity') as bank
            from generate_series(((now() at time zone zone)::date - 6)::timestamp, (now() at time zone zone)::date::timestamp, interval '1 day') date
            left join public.all_messages m on (m.received_at at time zone zone)::date = date::date
            group by date
        ) day_rows)
    ) into result;
    return result;
end;
$$;
revoke all on function public.dashboard_analytics(text) from public,anon,authenticated;
grant execute on function public.dashboard_analytics(text) to service_role;

create table if not exists public.message_receipts(id uuid primary key, created_at timestamptz not null default now());
alter table public.message_receipts enable row level security;
revoke all on public.message_receipts from public,anon,authenticated;
grant select,insert,delete on public.message_receipts to service_role;
insert into public.message_receipts(id,created_at) select id,min(created_at) from public.all_messages group by id on conflict(id) do nothing;
create or replace function public.ingest_messages(entries jsonb, audit_payload jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; stored integer := 0; fresh integer;
begin
    if jsonb_typeof(entries) != 'array' or jsonb_array_length(entries) not between 1 and 100 then raise exception 'Invalid batch'; end if;
    for item in select value from jsonb_array_elements(entries) loop
        if item->>'table' not in ('messages', 'otp_messages', 'bank_activity') then raise exception 'Invalid table'; end if;
        insert into public.message_receipts(id) values ((item->'row'->>'id')::uuid) on conflict(id) do nothing;
        get diagnostics fresh = row_count;
        if fresh=1 then
            execute format('insert into public.%I (id,sender,body,time,received_at,metadata) values ($1,$2,$3,$4,$5,$6) on conflict(id) do nothing', item->>'table')
                using (item->'row'->>'id')::uuid,item->'row'->>'sender',item->'row'->>'body',item->'row'->>'time',(item->'row'->>'received_at')::timestamptz,item->'row'->'metadata';
            stored := stored + 1;
        end if;
    end loop;
    insert into public.webhook_logs(id,payload,status) values (gen_random_uuid(),audit_payload,'success');
    delete from public.messages where created_at < now() - interval '30 days';
    delete from public.otp_messages where created_at < now() - interval '30 days';
    delete from public.bank_activity where created_at < now() - interval '30 days';
    delete from public.webhook_logs where created_at < now() - interval '30 days';
    return stored;
end;
$$;
create or replace function public.query_message_page(category text, page_offset integer, page_size integer, search_text text default '', only_unread boolean default false, only_reminder boolean default false)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
    if category not in ('all_messages','live','messages','otp_messages','bank_activity') or page_offset<0 or page_size not between 1 and 500 or length(search_text)>128 then raise exception 'Invalid page request'; end if;
    with filtered as (
        select * from public.all_messages where (category in ('all_messages','live') or _table=category)
            and (not only_unread or metadata->>'is_unread'='true') and (not only_reminder or metadata->>'is_reminder'='true')
            and (search_text='' or position(lower(search_text) in lower(body))>0 or position(lower(search_text) in lower(sender))>0)
    ), page as (select * from filtered order by (case when category='live' then created_at else received_at end) desc,created_at desc,_table,id limit page_size offset page_offset)
    select jsonb_build_object('data',coalesce((select jsonb_agg(row_to_json(page)) from page),'[]'::jsonb),'count',(select count(*) from filtered)) into result;
    return result;
end;
$$;
create or replace function public.export_dashboard() returns jsonb language sql stable security invoker set search_path = '' as $$
    select jsonb_build_object('export_date',now(),'messages',coalesce((select jsonb_agg(row_to_json(m) order by received_at,id) from public.messages m),'[]'::jsonb),
        'otp_messages',coalesce((select jsonb_agg(row_to_json(m) order by received_at,id) from public.otp_messages m),'[]'::jsonb),
        'bank_activity',coalesce((select jsonb_agg(row_to_json(m) order by received_at,id) from public.bank_activity m),'[]'::jsonb));
$$;
revoke all on function public.query_message_page(text,integer,integer,text,boolean,boolean),public.export_dashboard() from public,anon,authenticated;
grant execute on function public.query_message_page(text,integer,integer,text,boolean,boolean),public.export_dashboard() to service_role;

create table if not exists public.export_snapshots(snapshot_id uuid not null,item_index bigint not null,category text not null,record jsonb not null,expires_at timestamptz not null,primary key(snapshot_id,item_index));
alter table public.export_snapshots enable row level security;
revoke all on public.export_snapshots from public,anon,authenticated;
grant select,insert,delete on public.export_snapshots to service_role;
create table if not exists public.export_jobs(id uuid primary key, owner_session uuid not null, total bigint not null, expires_at timestamptz not null);
alter table public.export_jobs enable row level security;
revoke all on public.export_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.export_jobs to service_role;
drop function if exists public.start_export();
create or replace function public.start_export(owner_session uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare export_id uuid:=gen_random_uuid(); count bigint;
begin
    delete from public.export_snapshots where snapshot_id in (select id from public.export_jobs where expires_at<now());
    delete from public.export_jobs where expires_at<now();
    insert into public.export_snapshots
        select export_id,row_number() over(order by _table,received_at,id),_table,to_jsonb(m)-'_table',now()+interval '1 hour' from public.all_messages m;
    get diagnostics count=row_count;
    insert into public.export_jobs values(export_id,owner_session,count,now()+interval '1 hour');
    return export_id;
end;
$$;
create or replace function public.export_page(export_id uuid,page_offset bigint) returns jsonb language sql stable security invoker set search_path='' as $$
    select coalesce(jsonb_agg(row_to_json(page) order by item_index),'[]'::jsonb) from
        (select item_index,category,record from public.export_snapshots where snapshot_id=export_id and item_index>page_offset and expires_at>now() order by item_index limit 100) page;
$$;
create or replace function public.finish_export(export_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
    delete from public.export_snapshots where snapshot_id=export_id;
    delete from public.export_jobs where id=export_id;
end;
$$;
revoke all on function public.start_export(uuid),public.export_page(uuid,bigint),public.finish_export(uuid) from public,anon,authenticated;
grant execute on function public.start_export(uuid),public.export_page(uuid,bigint),public.finish_export(uuid) to service_role;
create table if not exists public.maintenance_runs(id integer primary key,last_run timestamptz not null);
alter table public.maintenance_runs enable row level security;
revoke all on public.maintenance_runs from public,anon,authenticated;
grant select,insert,update on public.maintenance_runs to service_role;
create or replace function public.prune_dashboard_data() returns void language plpgsql security invoker set search_path='' as $$
declare claimed integer;
begin
    insert into public.maintenance_runs values(1,now()) on conflict(id) do update set last_run=now()
        where public.maintenance_runs.last_run<now()-interval '1 hour';
    get diagnostics claimed=row_count;
    if claimed=0 then return; end if;
    delete from public.messages where created_at<now()-interval '30 days';
    delete from public.otp_messages where created_at<now()-interval '30 days';
    delete from public.bank_activity where created_at<now()-interval '30 days';
    delete from public.webhook_logs where created_at<now()-interval '30 days';
    delete from public.export_snapshots where expires_at<now();
    delete from public.export_jobs where expires_at<now();
    delete from public.dashboard_sessions where expires_at<now()-interval '1 day';
    delete from public.login_attempts where window_start<now()-interval '1 day';
end;
$$;
revoke all on function public.prune_dashboard_data() from public,anon,authenticated;
grant execute on function public.prune_dashboard_data() to service_role;
notify pgrst, 'reload schema';
commit;
