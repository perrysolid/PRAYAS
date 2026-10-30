-- CM Helpline 1905 prototype schema.
-- Complaints keep their full record (timeline, photos, supporters) as JSON, with the fields
-- dashboards filter on pulled out into columns. Only the server (service role) reads and writes;
-- row level security is on with no public policies, so the anon key can see nothing.

create table if not exists public.grievances (
  id text primary key,
  data jsonb not null,
  department_id text generated always as (data->>'departmentId') stored,
  district_id text generated always as (data->>'districtId') stored,
  status text generated always as (data->>'status') stored,
  level int generated always as ((data->>'level')::int) stored,
  citizen_mobile text generated always as (data->>'citizenMobile') stored,
  submitted_at timestamptz generated always as ((data->>'submittedAt')::timestamptz) stored,
  updated_at timestamptz not null default now()
);
create index if not exists grievances_dept_status on public.grievances (department_id, status);
create index if not exists grievances_district on public.grievances (district_id);
create index if not exists grievances_mobile on public.grievances (citizen_mobile);

create table if not exists public.whatsapp_messages (
  id uuid primary key,
  mobile text not null,
  dir text not null check (dir in ('in', 'out')),
  body text not null,
  grievance_id text references public.grievances (id) on delete set null,
  image text,
  status text not null,
  at timestamptz not null
);
create index if not exists whatsapp_messages_mobile_at on public.whatsapp_messages (mobile, at);

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null
);

alter table public.grievances enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.app_state enable row level security;
