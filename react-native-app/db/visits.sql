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

-- Auto-affecte owner_id depuis la propriete a la creation.
create or replace function public.fill_visit_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.owner_id is null and new.property_id is not null then
    select owner_id into new.owner_id
      from public.properties where id = new.property_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists visits_fill_owner on public.visits;
create trigger visits_fill_owner
  before insert or update on public.visits
  for each row execute procedure public.fill_visit_owner();

