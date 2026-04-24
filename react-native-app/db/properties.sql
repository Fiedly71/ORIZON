-- ORIZON - Schema Supabase: table properties
-- A executer dans le SQL Editor de Supabase une fois le projet cree.

create extension if not exists "uuid-ossp";

create table if not exists public.properties (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  location     text not null,
  price        numeric not null default 0,
  type         text not null,
  bedrooms     int  default 0,
  bathrooms    int  default 0,
  area         int  default 0,
  status       text default 'A vendre',
  rating       numeric default 0,
  reviews      int     default 0,
  amenities    text[]  default '{}',
  description  text    default '',
  image        text    default '',
  images       text[]  default '{}',
  owner_name   text    default '',
  owner_type   text    default '',
  agent_id     text,
  owner_id     uuid references auth.users(id) on delete set null,
  featured     boolean default false,
  verified     boolean default false,
  posted_at    date    default current_date,
  year_built   int,
  floors       int     default 0,
  lat          numeric,
  lng          numeric,
  created_at   timestamptz default now()
);

create index if not exists properties_type_idx     on public.properties(type);
create index if not exists properties_status_idx   on public.properties(status);
create index if not exists properties_price_idx    on public.properties(price);
create index if not exists properties_posted_idx   on public.properties(posted_at desc);
create index if not exists properties_owner_idx    on public.properties(owner_id);

-- Row Level Security
alter table public.properties enable row level security;

-- Lecture: tout le monde peut voir les annonces.
drop policy if exists "properties_select_all" on public.properties;
create policy "properties_select_all"
  on public.properties for select
  using (true);

-- Insertion: utilisateur connecte uniquement; owner_id est force a auth.uid().
drop policy if exists "properties_insert_auth" on public.properties;
create policy "properties_insert_auth"
  on public.properties for insert
  with check (auth.uid() is not null and (owner_id is null or owner_id = auth.uid()));

-- Update / Delete: seulement le proprietaire.
drop policy if exists "properties_update_owner" on public.properties;
create policy "properties_update_owner"
  on public.properties for update
  using (owner_id = auth.uid());

drop policy if exists "properties_delete_owner" on public.properties;
create policy "properties_delete_owner"
  on public.properties for delete
  using (owner_id = auth.uid());
