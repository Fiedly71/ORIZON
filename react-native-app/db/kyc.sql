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
