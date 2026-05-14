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
