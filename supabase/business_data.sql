-- Jory business data storage foundation (Free-tier compatible)
-- Run after supabase/schema.sql in the existing Supabase project.
-- This migration creates a protected cloud container; it does NOT enable app sync by itself.

create table if not exists public.jory_business_data (
  organization_id uuid primary key
    references public.jory_organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.jory_set_business_data_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  new.revision = old.revision + 1;
  return new;
end;
$$;

drop trigger if exists jory_business_data_updated_at on public.jory_business_data;
create trigger jory_business_data_updated_at
before update on public.jory_business_data
for each row execute function public.jory_set_business_data_updated_at();

alter table public.jory_business_data enable row level security;

drop policy if exists jory_business_data_read_members on public.jory_business_data;
create policy jory_business_data_read_members
on public.jory_business_data
for select to authenticated
using (public.jory_is_member(organization_id));

drop policy if exists jory_business_data_insert_admin on public.jory_business_data;
create policy jory_business_data_insert_admin
on public.jory_business_data
for insert to authenticated
with check (public.jory_is_admin(organization_id));

drop policy if exists jory_business_data_update_admin on public.jory_business_data;
create policy jory_business_data_update_admin
on public.jory_business_data
for update to authenticated
using (public.jory_is_admin(organization_id))
with check (public.jory_is_admin(organization_id));

grant select on public.jory_business_data to authenticated;
grant insert, update on public.jory_business_data to authenticated;

comment on table public.jory_business_data is
'Organization-scoped JSON snapshot for Jory business records. App sync must use revision checks and preserve local backups.';
