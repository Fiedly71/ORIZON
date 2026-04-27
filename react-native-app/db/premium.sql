-- ORIZON - Patch 7 - Premium ads, agency subscriptions, seller stats.
-- Tout idempotent. A executer dans le SQL Editor de Supabase.

-- ─────────────────────────────────────────────────────────────
-- 1) Boost premium sur properties (top des resultats X jours).
-- ─────────────────────────────────────────────────────────────
do $$
begin
  begin alter table public.properties add column if not exists is_premium boolean default false; exception when others then null; end;
  begin alter table public.properties add column if not exists premium_until timestamptz; exception when others then null; end;
  begin alter table public.properties add column if not exists views_count int default 0; exception when others then null; end;
  begin alter table public.properties add column if not exists contacts_count int default 0; exception when others then null; end;
end $$;

create index if not exists properties_premium_idx on public.properties(is_premium, premium_until);

-- Helper: appliquer un boost premium pour N jours apres confirmation paiement.
create or replace function public.apply_premium_boost(p_property_id uuid, p_days int)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.properties
     set is_premium = true,
         premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => p_days)
   where id = p_property_id;
end;
$$;
grant execute on function public.apply_premium_boost(uuid, int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2) Tracking events (vues, contacts, partages).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.property_events (
  id          bigserial primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  kind        text not null,             -- 'view' | 'contact' | 'share' | 'favorite'
  created_at  timestamptz default now()
);

create index if not exists property_events_prop_idx on public.property_events(property_id, kind, created_at desc);
create index if not exists property_events_kind_idx on public.property_events(kind, created_at desc);

alter table public.property_events enable row level security;

-- Insert: tout authentifie peut tracker (et anon aussi pour vues -> on autorise null user_id).
drop policy if exists "events_insert_any" on public.property_events;
create policy "events_insert_any"
  on public.property_events for insert
  with check (true);

-- Read: uniquement le owner du bien.
drop policy if exists "events_read_owner" on public.property_events;
create policy "events_read_owner"
  on public.property_events for select
  using (
    exists (
      select 1 from public.properties p
       where p.id = property_id and p.owner_id = auth.uid()
    )
  );

-- Trigger: incremente compteurs denormalises sur properties.
create or replace function public.bump_property_counters()
returns trigger
language plpgsql
as $$
begin
  if NEW.kind = 'view' then
    update public.properties set views_count = coalesce(views_count, 0) + 1 where id = NEW.property_id;
  elsif NEW.kind = 'contact' then
    update public.properties set contacts_count = coalesce(contacts_count, 0) + 1 where id = NEW.property_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_bump_property_counters on public.property_events;
create trigger trg_bump_property_counters
  after insert on public.property_events
  for each row execute procedure public.bump_property_counters();

-- ─────────────────────────────────────────────────────────────
-- 3) RPC: stats agregees pour un owner sur ses biens.
-- ─────────────────────────────────────────────────────────────
create or replace function public.seller_stats(p_owner uuid)
returns table (
  property_id uuid,
  title text,
  views_count int,
  contacts_count int,
  favorites_count int,
  is_premium boolean,
  premium_until timestamptz
)
language sql stable
as $$
  select id, title, coalesce(views_count, 0), coalesce(contacts_count, 0),
         coalesce(favorites_count, 0), coalesce(is_premium, false), premium_until
    from public.properties
   where owner_id = p_owner
   order by coalesce(views_count, 0) desc;
$$;
grant execute on function public.seller_stats(uuid) to authenticated;
