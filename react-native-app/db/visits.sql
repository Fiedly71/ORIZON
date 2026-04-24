-- ORIZON - table 'visits' pour le workflow de visite des biens.
create table if not exists public.visits (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references public.properties(id) on delete cascade,
  visitor_id    uuid references auth.users(id) on delete set null,
  owner_id      uuid references auth.users(id) on delete set null,
  scheduled_at  timestamptz not null,
  status        text not null default 'requested',
    -- requested | confirmed | declined | checked_in | completed | cancelled | no_show
  notes         text default '',
  feedback_rate int,
  feedback_text text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists visits_property_idx on public.visits(property_id);
create index if not exists visits_visitor_idx  on public.visits(visitor_id);
create index if not exists visits_owner_idx    on public.visits(owner_id);
create index if not exists visits_status_idx   on public.visits(status);

alter table public.visits enable row level security;

-- Lecture: visiteur ou proprietaire concerne.
drop policy if exists "visits_select_parties" on public.visits;
create policy "visits_select_parties"
  on public.visits for select
  using (visitor_id = auth.uid() or owner_id = auth.uid());

-- Insertion: visiteur authentifie cree une demande pour lui-meme.
drop policy if exists "visits_insert_self" on public.visits;
create policy "visits_insert_self"
  on public.visits for insert
  with check (visitor_id = auth.uid());

-- Mise a jour: visiteur ou proprietaire concerne.
drop policy if exists "visits_update_parties" on public.visits;
create policy "visits_update_parties"
  on public.visits for update
  using (visitor_id = auth.uid() or owner_id = auth.uid());
