-- saved_searches.sql - Recherches sauvegardees + matching auto + push notif
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  criteria jsonb not null default '{}'::jsonb,
  -- {q, type, status, minPrice, maxPrice, beds, baths, city, lat, lng, radiusKm}
  frequency text not null default 'instant' check (frequency in ('instant','daily','weekly','off')),
  last_match_at timestamptz,
  last_count int default 0,
  created_at timestamptz not null default now()
);

create index if not exists ss_user_idx on public.saved_searches(user_id, created_at desc);

alter table public.saved_searches enable row level security;
drop policy if exists ss_owner_select on public.saved_searches;
drop policy if exists ss_owner_insert on public.saved_searches;
drop policy if exists ss_owner_update on public.saved_searches;
drop policy if exists ss_owner_delete on public.saved_searches;

create policy ss_owner_select on public.saved_searches for select using (auth.uid() = user_id);
create policy ss_owner_insert on public.saved_searches for insert with check (auth.uid() = user_id);
create policy ss_owner_update on public.saved_searches for update using (auth.uid() = user_id);
create policy ss_owner_delete on public.saved_searches for delete using (auth.uid() = user_id);

-- Fonction de matching : compte les annonces matching pour une recherche
create or replace function public.match_saved_search(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  c jsonb; n int;
begin
  select criteria into c from public.saved_searches where id = p_id;
  if c is null then return 0; end if;
  select count(*) into n from public.properties p
  where p.moderation_status = 'approved'
    and (c->>'type' is null or p.type = c->>'type')
    and (c->>'status' is null or p.status = c->>'status')
    and (c->>'minPrice' is null or p.price >= (c->>'minPrice')::numeric)
    and (c->>'maxPrice' is null or p.price <= (c->>'maxPrice')::numeric)
    and (c->>'beds' is null or p.bedrooms >= (c->>'beds')::int)
    and (c->>'baths' is null or p.bathrooms >= (c->>'baths')::int)
    and (c->>'q' is null or (p.title ilike '%'||(c->>'q')||'%' or p.description ilike '%'||(c->>'q')||'%'));
  return n;
end $$;

grant execute on function public.match_saved_search(uuid) to authenticated;
