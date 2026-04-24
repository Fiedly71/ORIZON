-- ORIZON - avis sur biens et agents.
create table if not exists public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references public.properties(id) on delete cascade,
  agent_id      text,
  author_id     uuid references auth.users(id) on delete set null,
  rating        int not null check (rating between 1 and 5),
  title         text default '',
  content       text not null,
  status        text not null default 'pending', -- pending | approved | rejected
  created_at    timestamptz default now(),
  reviewed_at   timestamptz
);

create index if not exists reviews_property_idx on public.reviews(property_id);
create index if not exists reviews_status_idx   on public.reviews(status);

alter table public.reviews enable row level security;

drop policy if exists "reviews_public_read_approved" on public.reviews;
create policy "reviews_public_read_approved"
  on public.reviews for select
  using (status = 'approved' or author_id = auth.uid());

drop policy if exists "reviews_self_insert" on public.reviews;
create policy "reviews_self_insert"
  on public.reviews for insert
  with check (author_id = auth.uid());

drop policy if exists "reviews_self_delete" on public.reviews;
create policy "reviews_self_delete"
  on public.reviews for delete
  using (author_id = auth.uid());
