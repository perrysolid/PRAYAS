-- Login for the linked WhatsApp number (server/src/services/walink.service.ts), one row per key.
-- These are session keys for the WhatsApp account: server (service role) only, no public policies.
create table if not exists public.wa_auth (
  key text primary key,
  value text not null
);
alter table public.wa_auth enable row level security;
