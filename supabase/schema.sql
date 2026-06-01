-- Initialize the SMS Dashboard Schema
-- Run this in your Supabase SQL Editor if you haven't already.

create table if not exists sms_messages (
    id uuid default gen_random_uuid() primary key,
    -- user_id uuid references auth.users(id), -- Uncomment if using standard auth
    sender text not null,
    message_encrypted text not null,
    device_model text,
    timestamp bigint not null,
    received_at timestamp with time zone default now(),
    category text default 'general',
    metadata jsonb default '{}'::jsonb
);

-- Realtime needs replication turned on
begin;
    -- Drop publication if it exists to reset
    drop publication if exists supabase_realtime;
    create publication supabase_realtime;
commit;

alter publication supabase_realtime add table sms_messages;
