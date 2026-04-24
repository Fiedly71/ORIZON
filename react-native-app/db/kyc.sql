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
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text,
  verified    boolean default false,
  avatar_url  text,
  created_at  timestamptz default now()
);

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
