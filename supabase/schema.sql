-- Jory authentication foundation for Supabase (Free tier compatible)
-- Run only in the SQL Editor of the intended Supabase project.
-- This creates identity and organization membership tables only.
-- Business records remain local until they are migrated into permission-scoped tables.

create table if not exists public.jory_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.jory_memberships (
  organization_id uuid not null references public.jory_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee'
    check (role in ('owner','admin','supervisor','employee','viewer')),
  permissions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(permissions) = 'array'),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists jory_memberships_user_idx
  on public.jory_memberships(user_id);

create or replace function public.jory_is_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jory_memberships m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.jory_is_admin(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jory_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

create or replace function public.jory_is_owner(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jory_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.jory_add_initial_owner()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.created_by <> auth.uid() then
    raise exception 'Organization creator must be the authenticated user';
  end if;
  insert into public.jory_memberships(organization_id,user_id,role,permissions)
  values (new.id, auth.uid(), 'owner', '["*"]'::jsonb);
  return new;
end;
$$;

drop trigger if exists jory_org_initial_owner on public.jory_organizations;
create trigger jory_org_initial_owner
after insert on public.jory_organizations
for each row execute function public.jory_add_initial_owner();

alter table public.jory_organizations enable row level security;
alter table public.jory_memberships enable row level security;

drop policy if exists jory_org_read_members on public.jory_organizations;
create policy jory_org_read_members on public.jory_organizations
for select to authenticated
using (public.jory_is_member(id));

drop policy if exists jory_org_create_self on public.jory_organizations;
create policy jory_org_create_self on public.jory_organizations
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists jory_org_update_admin on public.jory_organizations;
create policy jory_org_update_admin on public.jory_organizations
for update to authenticated
using (public.jory_is_admin(id))
with check (public.jory_is_admin(id));

drop policy if exists jory_members_read_org on public.jory_memberships;
create policy jory_members_read_org on public.jory_memberships
for select to authenticated
using (public.jory_is_member(organization_id));

drop policy if exists jory_members_add_admin on public.jory_memberships;
create policy jory_members_add_admin on public.jory_memberships
for insert to authenticated
with check (
  public.jory_is_admin(organization_id)
  and (role <> 'owner' or public.jory_is_owner(organization_id))
);

drop policy if exists jory_members_update_admin on public.jory_memberships;
create policy jory_members_update_admin on public.jory_memberships
for update to authenticated
using (
  public.jory_is_admin(organization_id)
  and (role <> 'owner' or public.jory_is_owner(organization_id))
)
with check (
  public.jory_is_admin(organization_id)
  and (role <> 'owner' or public.jory_is_owner(organization_id))
);

drop policy if exists jory_members_delete_admin on public.jory_memberships;
create policy jory_members_delete_admin on public.jory_memberships
for delete to authenticated
using (
  public.jory_is_admin(organization_id)
  and role <> 'owner'
);

grant select, insert, update on public.jory_organizations to authenticated;
grant select, insert, update, delete on public.jory_memberships to authenticated;
grant execute on function public.jory_is_member(uuid) to authenticated;
grant execute on function public.jory_is_admin(uuid) to authenticated;
grant execute on function public.jory_is_owner(uuid) to authenticated;
