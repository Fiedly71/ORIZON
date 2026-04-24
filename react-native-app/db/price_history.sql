-- ORIZON - historique des prix d'un bien.
create table if not exists public.price_history (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  price        numeric not null,
  currency     text default 'USD',
  source       text default 'manual',  -- 'manual' | 'auto' | 'agent'
  noted_at     date default current_date,
  created_at   timestamptz default now()
);

create index if not exists price_history_property_idx on public.price_history(property_id, noted_at desc);

alter table public.price_history enable row level security;

drop policy if exists "price_history_public_read" on public.price_history;
create policy "price_history_public_read"
  on public.price_history for select using (true);

drop policy if exists "price_history_owner_write" on public.price_history;
create policy "price_history_owner_write"
  on public.price_history for insert
  with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );
