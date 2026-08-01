-- Patch 22 - Champs de contact optionnels sur profiles (site web + WhatsApp).
--
-- Ces champs alimentent les boutons de contact direct sur la page annonce :
--   - WhatsApp : lien wa.me d\u00e9j\u00e0 formatt\u00e9 (ex : https://wa.me/50942152569)
--   - Website : URL personnelle ou de l'agence
-- Si ils sont VIDES, la page annonce n'affiche que les boutons ORIZON
-- (R\u00e9servation + Message direct) : l'utilisateur ne peut contacter que via
-- la messagerie interne.
--
-- Idempotent. \u00c0 ex\u00e9cuter dans Supabase SQL Editor.

do $$
begin
  begin alter table public.profiles add column if not exists whatsapp_link text; exception when others then null; end;
  begin alter table public.profiles add column if not exists website text; exception when others then null; end;
end $$;

comment on column public.profiles.whatsapp_link is 'Lien wa.me complet (optionnel). Ex : https://wa.me/50942152569?text=Bonjour';
comment on column public.profiles.website is 'URL du site personnel ou de l''agence (optionnel).';

-- \u00c9tend l'RPC upsert_profile_bootstrap pour accepter whatsappLink + website.
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
    agency_name, referral_code, whatsapp_link, website, accepted_terms_at
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
    p_data->>'whatsappLink',
    p_data->>'website',
    now()
  )
  on conflict (id) do update set
    email          = coalesce(nullif(excluded.email, ''), public.profiles.email),
    full_name      = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone          = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    role           = coalesce(nullif(excluded.role, ''), public.profiles.role),
    address        = coalesce(nullif(excluded.address, ''), public.profiles.address),
    city           = coalesce(nullif(excluded.city, ''), public.profiles.city),
    department     = coalesce(nullif(excluded.department, ''), public.profiles.department),
    agency_name    = coalesce(nullif(excluded.agency_name, ''), public.profiles.agency_name),
    referral_code  = coalesce(nullif(excluded.referral_code, ''), public.profiles.referral_code),
    whatsapp_link  = coalesce(nullif(excluded.whatsapp_link, ''), public.profiles.whatsapp_link),
    website        = coalesce(nullif(excluded.website, ''), public.profiles.website),
    updated_at     = now();
end;
$$;

grant execute on function public.upsert_profile_bootstrap(uuid, jsonb) to anon, authenticated;
