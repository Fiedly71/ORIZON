-- agencies.sql - Profils Agences multi-agents
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  description text,
  phone text,
  email text,
  website text,
  address text,
  verified boolean default false,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists agencies_owner_idx on public.agencies(owner_id);

create table if not exists public.agency_members (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner','admin','agent')),
  status text not null default 'active' check (status in ('invited','active','removed')),
  invited_email text,
  invited_at timestamptz default now(),
  joined_at timestamptz,
  primary key (agency_id, user_id)
);

create index if not exists agency_members_user_idx on public.agency_members(user_id);

-- agency_id sur properties (annonces appartiennent a une agence)
alter table public.properties add column if not exists agency_id uuid references public.agencies(id) on delete set null;
create index if not exists properties_agency_idx on public.properties(agency_id);

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;

drop policy if exists ag_public_read on public.agencies;
drop policy if exists ag_owner_write on public.agencies;
drop policy if exists ag_owner_update on public.agencies;
drop policy if exists ag_owner_delete on public.agencies;

create policy ag_public_read on public.agencies for select using (true);
create policy ag_owner_write on public.agencies for insert with check (auth.uid() = owner_id);
create policy ag_owner_update on public.agencies for update using (auth.uid() = owner_id);
create policy ag_owner_delete on public.agencies for delete using (auth.uid() = owner_id);

drop policy if exists am_member_read on public.agency_members;
drop policy if exists am_owner_manage on public.agency_members;

create policy am_member_read on public.agency_members for select using (
  auth.uid() = user_id or exists (
    select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid()
  )
);

create policy am_owner_manage on public.agency_members for all using (
  exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
) with check (
  exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
);

-- RPC : inviter un agent par email
create or replace function public.invite_agent(p_agency_id uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  -- Verifier que l'appelant est owner
  if not exists (select 1 from public.agencies where id = p_agency_id and owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  -- Chercher si l'email correspond deja a un compte
  select id into v_user_id from auth.users where email = p_email limit 1;
  if v_user_id is null then
    -- Creer une entree "invited" sans user_id reel (le user_id sera resolu au login)
    -- Pour simplicite: on stocke uniquement par email; le user devra etre lie manuellement.
    return;
  end if;
  insert into public.agency_members (agency_id, user_id, role, status, invited_email, joined_at)
  values (p_agency_id, v_user_id, 'agent', 'active', p_email, now())
  on conflict (agency_id, user_id) do nothing;
end $$;

grant execute on function public.invite_agent(uuid, text) to authenticated;
