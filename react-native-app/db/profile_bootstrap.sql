-- Patch 21 - Bootstrap profil complet au signup (option B email non verifie).
--
-- Objectif : garantir que TOUS les champs d'inscription (nom, téléphone, rôle,
-- adresse, ville, département, nom d'agence, code parrain, email) sont
-- persistés dans public.profiles au moment de l'inscription, MEME si l'email
-- n'est pas encore vérifié. Ainsi les données remontent dans Supabase et le
-- dashboard admin même en attente de vérification email.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- 1) Colonnes manquantes sur public.profiles
-- ─────────────────────────────────────────────────────────────
do $$
begin
  begin alter table public.profiles add column if not exists email text; exception when others then null; end;
  begin alter table public.profiles add column if not exists city text; exception when others then null; end;
  begin alter table public.profiles add column if not exists department text; exception when others then null; end;
  begin alter table public.profiles add column if not exists referral_code text; exception when others then null; end;
  begin alter table public.profiles add column if not exists email_verified boolean default false; exception when others then null; end;
end $$;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_email_verified_idx on public.profiles(email_verified);

-- ─────────────────────────────────────────────────────────────
-- 2) Trigger handle_new_user() : capte TOUS les champs metadata.
--    On upsert pour être robuste si la ligne existe déjà.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, role, address, city, department,
    agency_name, referral_code, email_verified, accepted_terms_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'fullName', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'agencyName',
    new.raw_user_meta_data->>'referralCode',
    (new.email_confirmed_at is not null),
    now()
  )
  on conflict (id) do update set
    email       = excluded.email,
    full_name   = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone       = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    role        = coalesce(nullif(excluded.role, ''), public.profiles.role),
    address     = coalesce(nullif(excluded.address, ''), public.profiles.address),
    city        = coalesce(nullif(excluded.city, ''), public.profiles.city),
    department  = coalesce(nullif(excluded.department, ''), public.profiles.department),
    agency_name = coalesce(nullif(excluded.agency_name, ''), public.profiles.agency_name),
    referral_code = coalesce(nullif(excluded.referral_code, ''), public.profiles.referral_code),
    email_verified = excluded.email_verified,
    updated_at  = now();
  return new;
end;
$$;

-- Trigger déjà créé par kyc.sql; on recrée par sécurité s'il manque.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 3) Trigger de sync : quand l'utilisateur confirme son email
--    dans auth.users, on met à jour profiles.email_verified.
-- ─────────────────────────────────────────────────────────────
create or replace function public.sync_email_verified()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.profiles
       set email_verified = (new.email_confirmed_at is not null),
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.sync_email_verified();

-- ─────────────────────────────────────────────────────────────
-- 4) RPC : upsert_profile_bootstrap
--    Filet de sécurité côté client. Appelée après signUp, elle
--    remplit/complète la ligne profiles à partir d'un JSON. Ne
--    nécessite pas de session (utilise SECURITY DEFINER) mais
--    exige que l'user_id existe déjà dans auth.users.
--    Nota : safe à appeler plusieurs fois (upsert).
-- ─────────────────────────────────────────────────────────────
create or replace function public.upsert_profile_bootstrap(
  p_user_id uuid,
  p_data    jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- On vérifie que l'user_id correspond à un vrai auth.users
  if not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'user_id inconnu';
  end if;

  insert into public.profiles (
    id, email, full_name, phone, role, address, city, department,
    agency_name, referral_code, accepted_terms_at
  )
  values (
    p_user_id,
    p_data->>'email',
    p_data->>'fullName',
    p_data->>'phone',
    p_data->>'role',
    p_data->>'address',
    p_data->>'city',
    p_data->>'department',
    p_data->>'agencyName',
    p_data->>'referralCode',
    now()
  )
  on conflict (id) do update set
    email       = coalesce(nullif(excluded.email, ''), public.profiles.email),
    full_name   = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone       = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    role        = coalesce(nullif(excluded.role, ''), public.profiles.role),
    address     = coalesce(nullif(excluded.address, ''), public.profiles.address),
    city        = coalesce(nullif(excluded.city, ''), public.profiles.city),
    department  = coalesce(nullif(excluded.department, ''), public.profiles.department),
    agency_name = coalesce(nullif(excluded.agency_name, ''), public.profiles.agency_name),
    referral_code = coalesce(nullif(excluded.referral_code, ''), public.profiles.referral_code),
    updated_at  = now();
end;
$$;

grant execute on function public.upsert_profile_bootstrap(uuid, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5) Adaptation admin : listUsers voit tous les profils. On expose
--    aussi email_verified et created_at pour trier "à vérifier".
--    Rien à faire sur le service ici : l'app lit déjà profiles.*
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 6) Backfill : synchronise email + email_verified pour les
--    utilisateurs déjà existants dans auth.users.
-- ─────────────────────────────────────────────────────────────
update public.profiles p
   set email = u.email,
       email_verified = (u.email_confirmed_at is not null)
  from auth.users u
 where p.id = u.id
   and (p.email is null or p.email_verified is distinct from (u.email_confirmed_at is not null));
