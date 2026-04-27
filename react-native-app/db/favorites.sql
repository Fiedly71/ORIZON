-- ORIZON - Favoris utilisateur (table de jointure user <-> property).
create table if not exists public.favorites (
  user_id      uuid not null references auth.users(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (user_id, property_id)
);

create index if not exists favorites_user_idx     on public.favorites(user_id);
create index if not exists favorites_property_idx on public.favorites(property_id);

alter table public.favorites enable row level security;

drop policy if exists "favorites_self_rw" on public.favorites;
create policy "favorites_self_rw"
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Compteur de favoris sur properties (utile pour ranking "Top biens").
do $$
begin
  begin alter table public.properties add column if not exists favorites_count int default 0; exception when others then null; end;
end $$;

create or replace function public.bump_favorites_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.properties set favorites_count = coalesce(favorites_count, 0) + 1
     where id = new.property_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.properties set favorites_count = greatest(coalesce(favorites_count, 1) - 1, 0)
     where id = old.property_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists favorites_count_trg on public.favorites;
create trigger favorites_count_trg
  after insert or delete on public.favorites
  for each row execute procedure public.bump_favorites_count();
