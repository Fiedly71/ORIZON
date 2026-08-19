-- Patch - Publication automatique pour Proprietaire/Agence (sans approbation prealable).
--
-- Avant: can_publish demarrait a false et n'etait bascule a true qu'apres
-- validation manuelle du KYC par un admin (voir kyc.sql / verification_levels.sql).
-- Un proprietaire/agence fraichement inscrit devait donc attendre notre
-- approbation avant de pouvoir publier sa premiere annonce.
--
-- Maintenant: un compte Proprietaire ou Agence peut publier des la fin de
-- son inscription (email confirme), SANS attendre une approbation prealable.
-- Le controle se fait a posteriori : si une verification revele un probleme,
-- l'equipe ORIZON met le compte "sous attente" via le flag existant
-- profiles.banned (deja utilise par le dashboard admin - AdminScreen /
-- setUserBanned) - cela bloque alors la publication de nouvelles annonces
-- (voir garde cote app dans SellWizardScreen.js).
--
-- Idempotent. A executer dans Supabase SQL Editor.

-- 0) Colonnes requises (au cas ou admin_user_columns.sql / kyc.sql n'auraient
--    pas encore ete executes sur cette base : evite "column does not exist").
do $$
begin
  begin alter table public.profiles add column if not exists banned boolean default false; exception when others then null; end;
  begin alter table public.profiles add column if not exists can_publish boolean default false; exception when others then null; end;
end $$;

-- 1) handle_new_user : can_publish=true par defaut pour Proprietaire/Agence.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, role, address, city, department,
    agency_name, referral_code, email_verified, accepted_terms_at,
    whatsapp_link, website, can_publish
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
    now(),
    new.raw_user_meta_data->>'whatsappLink',
    new.raw_user_meta_data->>'website',
    (new.raw_user_meta_data->>'role' in ('Propriétaire', 'Agence'))
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
    whatsapp_link = coalesce(nullif(excluded.whatsapp_link, ''), public.profiles.whatsapp_link),
    website     = coalesce(nullif(excluded.website, ''), public.profiles.website),
    email_verified = excluded.email_verified,
    can_publish = public.profiles.can_publish or excluded.can_publish,
    updated_at  = now();
  return new;
end;
$$;

-- 2) Backfill : debloque les comptes Proprietaire/Agence existants qui
--    attendaient encore une validation KYC, sauf ceux deja mis sous attente
--    (banned = true).
update public.profiles
   set can_publish = true,
       updated_at = now()
 where role in ('Propriétaire', 'Agence')
   and can_publish = false
   and coalesce(banned, false) = false;

-- 3) upsert_profile_bootstrap (filet de securite appele apres signUp cote
--    client, meme sans session) : meme regle can_publish=true pour
--    Proprietaire/Agence.
create or replace function public.upsert_profile_bootstrap(
  p_user_id uuid,
  p_data    jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'user_id inconnu';
  end if;

  insert into public.profiles (
    id, email, full_name, phone, role, address, city, department,
    agency_name, referral_code, accepted_terms_at,
    whatsapp_link, website, can_publish
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
    now(),
    p_data->>'whatsappLink',
    p_data->>'website',
    (p_data->>'role' in ('Propriétaire', 'Agence'))
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
    whatsapp_link = coalesce(nullif(excluded.whatsapp_link, ''), public.profiles.whatsapp_link),
    website     = coalesce(nullif(excluded.website, ''), public.profiles.website),
    can_publish = public.profiles.can_publish or excluded.can_publish,
    updated_at  = now();
end;
$$;

grant execute on function public.upsert_profile_bootstrap(uuid, jsonb) to anon, authenticated;
