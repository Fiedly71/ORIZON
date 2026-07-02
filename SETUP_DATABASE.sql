-- ORIZON - SETUP COMPLET BASE DE DONNEES
-- A executer dans Supabase SQL Editor (ordre respecte, idempotent).
-- Date: 2026-04-27


-- ============================================================================
-- properties.sql
-- ============================================================================

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


-- ============================================================================
-- storage.sql
-- ============================================================================

-- ORIZON - Supabase Storage: bucket property-images (public read)
-- A executer apres properties.sql.

-- Bucket public en lecture, ecriture restreinte aux utilisateurs authentifies.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = excluded.public;

-- Lecture publique (le bucket est deja public, mais on declare la policy explicitement).
drop policy if exists "property_images_read" on storage.objects;
create policy "property_images_read"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- Insertion: utilisateurs authentifies.
drop policy if exists "property_images_insert" on storage.objects;
create policy "property_images_insert"
  on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.uid() is not null);

-- Suppression: uniquement le proprietaire de l'objet (owner = auth.uid()).
drop policy if exists "property_images_delete" on storage.objects;
create policy "property_images_delete"
  on storage.objects for delete
  using (bucket_id = 'property-images' and owner = auth.uid());


-- ============================================================================
-- kyc.sql
-- ============================================================================

-- ORIZON - KYC: dossiers de verification utilisateur.
create table if not exists public.kyc_submissions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  full_name     text not null,
  doc_type      text not null,        -- cin | passport | driver_license
  doc_number    text not null,
  selfie_url    text,
  doc_front_url text,
  doc_back_url  text,
  status        text not null default 'pending',  -- pending | approved | rejected
  reason        text,
  reviewer_id   uuid references auth.users(id),
  created_at    timestamptz default now(),
  reviewed_at   timestamptz
);

create index if not exists kyc_user_idx on public.kyc_submissions(user_id);
create index if not exists kyc_status_idx on public.kyc_submissions(status);

alter table public.kyc_submissions enable row level security;

drop policy if exists "kyc_self_read" on public.kyc_submissions;
create policy "kyc_self_read"
  on public.kyc_submissions for select
  using (user_id = auth.uid());

drop policy if exists "kyc_self_insert" on public.kyc_submissions;
create policy "kyc_self_insert"
  on public.kyc_submissions for insert
  with check (user_id = auth.uid());

-- Champ verifie sur la table profils (cree par defaut par Supabase ou par nous).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  agency_name   text,
  phone         text,
  address       text,
  bio           text,
  role          text,                  -- 'Acheteur / Locataire' | 'Proprietaire' | 'Agence'
  verified      boolean default false, -- KYC valide
  can_publish   boolean default false, -- mis a true apres KYC approve
  avatar_url    text,
  accepted_terms_at timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Migration douce: ajoute les colonnes si table existait deja (pas d'erreur si deja la).
do $$
begin
  begin alter table public.profiles add column if not exists agency_name text; exception when others then null; end;
  begin alter table public.profiles add column if not exists address text; exception when others then null; end;
  begin alter table public.profiles add column if not exists bio text; exception when others then null; end;
  begin alter table public.profiles add column if not exists can_publish boolean default false; exception when others then null; end;
  begin alter table public.profiles add column if not exists accepted_terms_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists updated_at timestamptz default now(); exception when others then null; end;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_rw" on public.profiles;
create policy "profiles_self_rw"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

-- Trigger pour creer une ligne profiles a chaque nouvel utilisateur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, accepted_terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'fullName', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'role',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fonction pour basculer can_publish a true automatiquement quand le KYC est approuve.
create or replace function public.handle_kyc_approved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    update public.profiles
       set verified = true,
           can_publish = true,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_kyc_approved on public.kyc_submissions;
create trigger on_kyc_approved
  after update on public.kyc_submissions
  for each row execute procedure public.handle_kyc_approved();


-- ============================================================================
-- payments.sql
-- ============================================================================

-- ORIZON - table 'payments': historique des paiements (Stripe + MonCash).
create table if not exists public.payments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  property_id   uuid references public.properties(id) on delete set null,
  provider      text not null,          -- 'stripe' | 'moncash' | 'mock'
  purpose       text not null default 'listing', -- 'listing' | 'subscription' | 'boost'
  amount        numeric not null,
  currency      text not null default 'USD',  -- 'USD' | 'HTG'
  status        text not null default 'pending', -- pending | succeeded | failed | refunded
  reference     text,                   -- payment_intent_id (Stripe) ou orderId (MonCash)
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  confirmed_at  timestamptz
);

-- Migration douce
do $$
begin
  begin alter table public.payments add column if not exists purpose text default 'listing'; exception when others then null; end;
  begin alter table public.payments add column if not exists confirmed_at timestamptz; exception when others then null; end;
end $$;

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_property_idx on public.payments(property_id);

alter table public.payments enable row level security;

drop policy if exists "payments_self_read" on public.payments;
create policy "payments_self_read"
  on public.payments for select
  using (user_id = auth.uid());

drop policy if exists "payments_self_insert" on public.payments;
create policy "payments_self_insert"
  on public.payments for insert
  with check (user_id = auth.uid());

drop policy if exists "payments_self_update" on public.payments;
create policy "payments_self_update"
  on public.payments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ajout du champ payment_status sur properties: les annonces ne sont
-- visibles publiquement qu'apres paiement confirme.
do $$
begin
  begin alter table public.properties add column if not exists payment_status text default 'unpaid'; exception when others then null; end;
  begin alter table public.properties add column if not exists payment_id uuid references public.payments(id) on delete set null; exception when others then null; end;
  begin alter table public.properties add column if not exists published_at timestamptz; exception when others then null; end;
end $$;

create index if not exists properties_payment_status_idx on public.properties(payment_status);

-- On retravaille la policy SELECT: public ne voit que les annonces payees,
-- mais le proprietaire voit toutes les siennes (meme unpaid).
drop policy if exists "properties_select_all" on public.properties;
drop policy if exists "properties_select_paid_or_owner" on public.properties;
create policy "properties_select_paid_or_owner"
  on public.properties for select
  using (
    payment_status = 'paid'
    or owner_id = auth.uid()
  );

-- Table subscriptions: abonnements agence (Patch 7), pose les bases.
create table if not exists public.subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan          text not null,          -- 'agency_basic' | 'agency_pro'
  status        text not null default 'active',  -- active | cancelled | past_due
  provider      text,
  reference     text,
  current_period_end timestamptz,
  created_at    timestamptz default now()
);

create index if not exists subs_user_idx on public.subscriptions(user_id);
create index if not exists subs_status_idx on public.subscriptions(status);

alter table public.subscriptions enable row level security;

drop policy if exists "subs_self_rw" on public.subscriptions;
create policy "subs_self_rw"
  on public.subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper pour confirmer un paiement et basculer la propriete en 'paid'
-- (utilise par le webhook ou par le service client en mock).
create or replace function public.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_property_id uuid;
begin
  update public.payments
     set status = 'succeeded',
         confirmed_at = now()
   where id = p_payment_id
     and status = 'pending'
   returning property_id into v_property_id;

  if v_property_id is not null then
    update public.properties
       set payment_status = 'paid',
           payment_id = p_payment_id,
           published_at = now()
     where id = v_property_id;
  end if;
end;
$$;

grant execute on function public.confirm_payment(uuid) to authenticated;



-- ============================================================================
-- favorites.sql
-- ============================================================================

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


-- ============================================================================
-- reviews.sql
-- ============================================================================

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



-- ============================================================================
-- visits.sql
-- ============================================================================

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



-- ============================================================================
-- push_tokens.sql
-- ============================================================================

-- ORIZON - table push_tokens pour Expo Push Notifications.
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  platform    text,
  updated_at  timestamptz default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_self_rw" on public.push_tokens;
create policy "push_tokens_self_rw"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- reports.sql
-- ============================================================================

-- ORIZON - signalement de contenus suspects.
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid references auth.users(id) on delete set null,
  target_type  text not null,        -- 'property' | 'review' | 'user'
  target_id    text not null,
  reason       text not null,        -- 'fake' | 'fraud' | 'spam' | 'inappropriate' | 'other'
  details      text default '',
  status       text not null default 'open', -- open | in_review | resolved | dismissed
  resolution   text,
  reviewer_id  uuid references auth.users(id),
  created_at   timestamptz default now(),
  resolved_at  timestamptz
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_target_idx on public.reports(target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "reports_self_read" on public.reports;
create policy "reports_self_read"
  on public.reports for select
  using (reporter_id = auth.uid());

drop policy if exists "reports_self_insert" on public.reports;
create policy "reports_self_insert"
  on public.reports for insert
  with check (reporter_id = auth.uid());


-- ============================================================================
-- price_history.sql
-- ============================================================================

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


-- ============================================================================
-- premium.sql
-- ============================================================================

-- ORIZON - Patch 7 - Premium ads, agency subscriptions, seller stats.
-- Tout idempotent. A executer dans le SQL Editor de Supabase.

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1) Boost premium sur properties (top des resultats X jours).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2) Tracking events (vues, contacts, partages).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3) RPC: stats agregees pour un owner sur ses biens.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- ============================================================================
-- moderation.sql
-- ============================================================================

-- ORIZON - Patch 9 - Moderation reviews/photos + queue admin.
-- Idempotent.

-- IMPORTANT: ajouter is_admin AVANT toute policy qui le reference.
do $$
begin
  begin alter table public.profiles add column if not exists is_admin boolean default false; exception when others then null; end;
end $$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1) On rebascule reviews en moderation manuelle (status=pending par defaut),
--    avec auto-approbation si pas de mot interdit (cote client + trigger).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
do $$
begin
  begin alter table public.reviews alter column status set default 'pending'; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderation_reason text; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderated_at timestamptz; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderated_by uuid references auth.users(id); exception when others then null; end;
end $$;

-- Liste de mots interdits simple (extensible).
create table if not exists public.banned_words (
  word text primary key
);

insert into public.banned_words(word) values
  ('arnaque'), ('escroquerie'), ('voleur'), ('fraude'),
  ('insulte'), ('connard'), ('salope'), ('pute'),
  ('scam'), ('fraud'), ('thief')
on conflict do nothing;

-- Trigger: auto-flag review si contient un mot interdit.
create or replace function public.review_auto_moderate()
returns trigger
language plpgsql
as $$
declare
  v_hit text;
begin
  select w.word into v_hit
    from public.banned_words w
   where lower(coalesce(NEW.content, '')) like '%' || w.word || '%'
   limit 1;
  if v_hit is not null then
    NEW.status := 'flagged';
    NEW.moderation_reason := 'banned_word: ' || v_hit;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_review_auto_moderate on public.reviews;
create trigger trg_review_auto_moderate
  before insert on public.reviews
  for each row execute procedure public.review_auto_moderate();

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2) Queue moderation des photos (etat: pending/approved/rejected).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists public.photo_moderation (
  id          bigserial primary key,
  property_id uuid references public.properties(id) on delete cascade,
  url         text not null,
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'pending',  -- pending | approved | rejected
  reason      text,
  created_at  timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists photo_mod_status_idx on public.photo_moderation(status, created_at desc);
create index if not exists photo_mod_prop_idx on public.photo_moderation(property_id);

alter table public.photo_moderation enable row level security;

-- Insert: l'utilisateur connecte peut soumettre ses propres photos.
drop policy if exists "photo_mod_insert_self" on public.photo_moderation;
create policy "photo_mod_insert_self"
  on public.photo_moderation for insert
  with check (user_id = auth.uid());

-- Read: l'utilisateur voit ses propres soumissions; admin voit tout (via role).
drop policy if exists "photo_mod_read_self" on public.photo_moderation;
create policy "photo_mod_read_self"
  on public.photo_moderation for select
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Update reserve aux admins.
drop policy if exists "photo_mod_update_admin" on public.photo_moderation;
create policy "photo_mod_update_admin"
  on public.photo_moderation for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3) Champ is_admin sur profiles (pour la console admin future).
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
do $$
begin
  begin alter table public.profiles add column if not exists is_admin boolean default false; exception when others then null; end;
end $$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4) Reviews: lecture publique limitee aux 'approved'; le owner voit aussi 'pending'/'flagged'.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_select_approved_or_owner" on public.reviews;
create policy "reviews_select_approved_or_owner"
  on public.reviews for select
  using (
    status = 'approved'
    or author_id = auth.uid()
    or exists (
      select 1 from public.properties p
       where p.id = property_id and p.owner_id = auth.uid()
    )
  );


-- ============================================================================
-- account_deletion.sql
-- ============================================================================

-- Patch 13 - Suppression de compte (Apple App Store 5.1.1v + RGPD)
-- Idempotent.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  requested_at timestamptz default now(),
  processed_at timestamptz,
  status text default 'pending' -- pending | done
);

alter table public.account_deletion_requests enable row level security;

drop policy if exists del_self_insert on public.account_deletion_requests;
create policy del_self_insert on public.account_deletion_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists del_self_select on public.account_deletion_requests;
create policy del_self_select on public.account_deletion_requests
  for select using (auth.uid() = user_id);

-- RPC: anonymise immediatement le profil + marque les annonces archived
-- + insere une demande de suppression du auth.users a traiter dans 30 jours
-- (cron / edge function) pour respecter la fenetre de retractation legale.
create or replace function public.request_account_deletion(p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Anonymise immediatement le profil visible
  update public.profiles set
    full_name = 'Compte supprime',
    phone = null,
    avatar_url = null,
    agency_name = null,
    address = null,
    bio = null,
    verified = false,
    can_publish = false
  where id = uid;

  -- Archive les annonces (ne supprime pas pour preserver l'historique paiements)
  update public.properties set
    payment_status = 'archived',
    title = 'Annonce retiree'
  where owner_id = uid;

  -- Anonymise les avis laisses
  update public.reviews set
    content = '[supprime]',
    title = ''
  where author_id = uid;

  -- Cree la demande (le purge definitif sera fait par un job admin / supabase admin API)
  insert into public.account_deletion_requests(user_id, reason)
  values (uid, p_reason);
end;
$$;

grant execute on function public.request_account_deletion(text) to authenticated;


-- ============================================================================
-- blocks.sql
-- ============================================================================

-- Patch 14 - Blocage d'utilisateurs (Apple App Store guideline 1.2 UGC)
-- Idempotent.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create index if not exists ix_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists ix_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists blocks_self_select on public.user_blocks;
create policy blocks_self_select on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists blocks_self_insert on public.user_blocks;
create policy blocks_self_insert on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocks_self_delete on public.user_blocks;
create policy blocks_self_delete on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- Vue: properties visibles (exclut les annonces des users que je bloque)
create or replace view public.properties_visible as
select p.* from public.properties p
where not exists (
  select 1 from public.user_blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = p.owner_id
);

grant select on public.properties_visible to authenticated, anon;


-- ============================================================================
-- thumbnails.sql
-- ============================================================================

-- Patch 17 - Ajout colonne thumbs (versions low-res des photos pour listes)
alter table public.properties add column if not exists thumbs jsonb default '[]'::jsonb;

-- Index pour pagination performante
create index if not exists ix_properties_posted_at on public.properties(posted_at desc);
create index if not exists ix_properties_payment_status on public.properties(payment_status);


-- ============================================================================
-- demo_seed.sql
-- ============================================================================

-- Patch 18 - Comptes de demonstration pour les reviewers Apple/Google.
-- A executer APRES avoir cree les 3 users via Supabase Studio > Authentication > Add user
-- avec les emails ci-dessous (mot de passe: Demo2026!Orizon).
--
-- Comptes a creer manuellement dans Supabase Auth:
--   1. demo.acheteur@orizon.ht  (role: Acheteur / Locataire)
--   2. demo.proprio@orizon.ht   (role: Proprietaire, KYC valide, can_publish=true)
--   3. demo.agence@orizon.ht    (role: Agence, KYC valide, can_publish=true)
-- Mot de passe partage: Demo2026!Orizon
--
-- Apres creation, recupere les UUID et remplace ci-dessous, puis execute ce script.

do $$
declare
  uid_buyer  uuid := (select id from auth.users where email = 'demo.acheteur@orizon.ht' limit 1);
  uid_owner  uuid := (select id from auth.users where email = 'demo.proprio@orizon.ht'  limit 1);
  uid_agency uuid := (select id from auth.users where email = 'demo.agence@orizon.ht'   limit 1);
begin
  if uid_buyer is null or uid_owner is null or uid_agency is null then
    raise notice 'Cree d''abord les 3 users dans Supabase Auth avant de relancer ce seed.';
    return;
  end if;

  -- Profils
  insert into public.profiles(id, full_name, phone, role, verified, can_publish)
  values
    (uid_buyer,  'Demo Acheteur',       '+509 30001001', 'Acheteur / Locataire', false, false),
    (uid_owner,  'Demo Proprietaire',   '+509 30002002', 'Proprietaire',         true,  true),
    (uid_agency, 'Agence Demo ORIZON',  '+509 30003003', 'Agence',               true,  true)
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    verified = excluded.verified,
    can_publish = excluded.can_publish;

  -- IMPORTANT : plus aucune annonce de demo n'est cree ici.
  -- Le site doit rester vide en attendant les vraies publications des utilisateurs.

  raise notice 'Seed demo OK - 3 comptes reviewers crees (aucune annonce seedee).';
end $$;




-- ============================================================================
-- moncash_manual.sql
-- ============================================================================

-- Patch 19 - Paiement MonCash manuel avec validation admin.
-- Modele : client paye sur MonCash 39934388, soumet ref+phone, admin valide.

-- 1) Ajout des colonnes specifiques MonCash sur payments
do $$
begin
  begin alter table public.payments add column if not exists moncash_reference text; exception when others then null; end;
  begin alter table public.payments add column if not exists moncash_phone text; exception when others then null; end;
  begin alter table public.payments add column if not exists rejection_reason text; exception when others then null; end;
  begin alter table public.payments add column if not exists rejected_at timestamptz; exception when others then null; end;
  begin alter table public.payments add column if not exists refunded boolean default false; exception when others then null; end;
  begin alter table public.payments add column if not exists refund_reason text; exception when others then null; end;
  begin alter table public.payments add column if not exists refunded_at timestamptz; exception when others then null; end;
  begin alter table public.payments add column if not exists method text; exception when others then null; end;
end $$;

-- 2) Reference MonCash unique : empeche double soumission
create unique index if not exists payments_moncash_ref_uniq
  on public.payments(moncash_reference)
  where moncash_reference is not null;

-- 3) Index pour les recherches admin
create index if not exists payments_pending_idx on public.payments(status, created_at desc)
  where status = 'pending';

-- 4) Admin policy : peut tout lire et tout modifier sur payments
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all"
  on public.payments for all
  using (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5) RPC pour soumettre un paiement MonCash (rate limit cote app)
create or replace function public.submit_moncash_payment(
  p_property_id uuid,
  p_amount      numeric,
  p_currency    text,
  p_purpose     text,
  p_reference   text,
  p_phone       text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pending_count int;
  v_payment_id uuid;
begin
  if v_uid is null then
    raise exception 'Non authentifie';
  end if;

  -- Anti-fraude : max 3 paiements pendants par user
  select count(*) into v_pending_count
    from public.payments
   where user_id = v_uid and status = 'pending';
  if v_pending_count >= 3 then
    raise exception 'Tu as deja 3 paiements en attente de validation. Attends qu''ils soient traites.';
  end if;

  -- Reference deja utilisee ?
  if exists(select 1 from public.payments where moncash_reference = p_reference) then
    raise exception 'Cette reference MonCash a deja ete soumise.';
  end if;

  insert into public.payments(
    user_id, property_id, provider, method, purpose,
    amount, currency, status,
    moncash_reference, moncash_phone, reference
  ) values (
    v_uid, p_property_id, 'moncash', 'moncash', coalesce(p_purpose, 'listing'),
    p_amount, coalesce(p_currency, 'HTG'), 'pending',
    p_reference, p_phone, p_reference
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

grant execute on function public.submit_moncash_payment(uuid, numeric, text, text, text, text) to authenticated;

-- 6) RPC approbation admin (active la propriete liee si applicable)
create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not v_is_admin then
    raise exception 'Reserve aux administrateurs';
  end if;

  perform public.confirm_payment(p_payment_id);
end;
$$;

grant execute on function public.approve_payment(uuid) to authenticated;

-- 7) RPC rejet admin
create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not v_is_admin then
    raise exception 'Reserve aux administrateurs';
  end if;

  update public.payments
     set status = 'failed',
         rejection_reason = p_reason,
         rejected_at = now()
   where id = p_payment_id
     and status = 'pending';
end;
$$;

grant execute on function public.reject_payment(uuid, text) to authenticated;



-- ============================================================================
-- verification_levels.sql
-- ============================================================================

-- Patch 20 - Niveaux de verification + revocation auto + RPC admin.

-- 1) Ajout des colonnes verification_level + verified_at sur profiles
do $$
begin
  begin alter table public.profiles add column if not exists verification_level text default 'none'; exception when others then null; end;
  begin alter table public.profiles add column if not exists verified_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists verification_revoked_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists verification_revoke_reason text; exception when others then null; end;
end $$;

-- Niveaux possibles : none | basic | pro | premium
-- - none    : aucune verification
-- - basic   : KYC approuve (defaut quand verified=true)
-- - pro     : agence verifiee + KYC + min 5 annonces
-- - premium : pro + rating >= 4.7 + 10+ avis

-- 2) Met a jour le trigger handle_kyc_approved pour aussi setter le niveau et timestamp
create or replace function public.handle_kyc_approved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    update public.profiles
       set verified = true,
           can_publish = true,
           verification_level = case
             when verification_level in ('pro', 'premium') then verification_level
             else 'basic'
           end,
           verified_at = coalesce(verified_at, now()),
           verification_revoked_at = null,
           verification_revoke_reason = null,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$;

-- 3) RPC admin : forcer un niveau de verification (utile pour comptes pro/premium)
create or replace function public.set_verification_level(
  p_user_id uuid,
  p_level   text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not v_is_admin then
    raise exception 'Reserve aux administrateurs';
  end if;

  if p_level not in ('none', 'basic', 'pro', 'premium') then
    raise exception 'Niveau invalide. Utilise none|basic|pro|premium';
  end if;

  update public.profiles
     set verification_level = p_level,
         verified = (p_level <> 'none'),
         can_publish = (p_level <> 'none'),
         verified_at = case when p_level = 'none' then null else coalesce(verified_at, now()) end,
         verification_revoked_at = case when p_level = 'none' then now() else null end,
         verification_revoke_reason = case when p_level = 'none' then 'admin_override' else null end,
         updated_at = now()
   where id = p_user_id;
end;
$$;

grant execute on function public.set_verification_level(uuid, text) to authenticated;

-- 4) Revocation auto si trop de signalements resolus contre l'utilisateur
-- Seuil : 3 reports valides (status='resolved' avec action='ban' ou 'remove') sur ses annonces
create or replace function public.check_user_revocation(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_bad_reports int;
begin
  -- Compte les signalements resolus negativement contre cet utilisateur
  select count(*) into v_bad_reports
    from public.reports r
    join public.properties p on p.id = r.property_id
   where p.owner_id = p_user_id
     and r.status = 'resolved'
     and r.resolution in ('removed', 'banned');

  if v_bad_reports >= 3 then
    update public.profiles
       set verified = false,
           verification_level = 'none',
           verification_revoked_at = now(),
           verification_revoke_reason = 'too_many_reports',
           updated_at = now()
     where id = p_user_id
       and verified = true;
  end if;
end;
$$;

-- 5) Trigger qui appelle check_user_revocation quand un report est resolu
create or replace function public.on_report_resolved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.status = 'resolved' and (old.status is null or old.status <> 'resolved') then
    select owner_id into v_owner from public.properties where id = new.property_id;
    if v_owner is not null then
      perform public.check_user_revocation(v_owner);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_on_report_resolved on public.reports;
create trigger trg_on_report_resolved
  after update on public.reports
  for each row execute procedure public.on_report_resolved();

-- 6) Index pour les requetes de badge
create index if not exists profiles_verified_idx on public.profiles(verified) where verified = true;
create index if not exists profiles_level_idx on public.profiles(verification_level);

-- ============================================================================
-- HELPERS POUR L'ADMIN (a executer manuellement dans Supabase SQL Editor)
-- ============================================================================

-- Verifier un compte par EMAIL (le plus simple) :
--
--   update public.profiles
--      set verified = true,
--          can_publish = true,
--          verification_level = 'basic',
--          verified_at = now()
--    where id = (select id from auth.users where email = 'TON_EMAIL@example.com');
--
-- Promouvoir au niveau PRO :
--
--   update public.profiles
--      set verification_level = 'pro'
--    where id = (select id from auth.users where email = 'AGENCE@example.com');
--
-- Promouvoir au niveau PREMIUM :
--
--   update public.profiles
--      set verification_level = 'premium'
--    where id = (select id from auth.users where email = 'TOP_AGENCE@example.com');
--
-- Revoquer manuellement :
--
--   update public.profiles
--      set verified = false,
--          verification_level = 'none',
--          verification_revoked_at = now(),
--          verification_revoke_reason = 'manuel'
--    where id = (select id from auth.users where email = 'BAD_USER@example.com');

