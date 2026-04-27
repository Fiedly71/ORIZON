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

-- Auto-approbation par defaut (sandbox). En prod, mettre a 'pending' et moderer.
alter table public.reviews alter column status set default 'approved';

-- Trigger qui recalcule properties.rating et properties.reviews
-- a chaque insertion/suppression/changement de statut d'un avis approuve.
create or replace function public.recalc_property_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_pid uuid;
begin
  v_pid := coalesce(new.property_id, old.property_id);
  if v_pid is null then return null; end if;

  update public.properties p
     set rating = coalesce((
           select round(avg(r.rating)::numeric, 1)
             from public.reviews r
            where r.property_id = v_pid and r.status = 'approved'
         ), 0),
         reviews = coalesce((
           select count(*)::int
             from public.reviews r
            where r.property_id = v_pid and r.status = 'approved'
         ), 0)
   where p.id = v_pid;

  return null;
end;
$$;

drop trigger if exists reviews_recalc_trg on public.reviews;
create trigger reviews_recalc_trg
  after insert or update or delete on public.reviews
  for each row execute procedure public.recalc_property_rating();

