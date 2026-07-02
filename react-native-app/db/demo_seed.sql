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
  -- Les reviewers (Apple/Google) verront la page d'annonces vide ou avec les
  -- publications reelles des vrais proprietaires - c'est le comportement attendu.

  raise notice 'Seed demo OK - 3 comptes reviewers crees (aucune annonce seedee).';
end $$;
