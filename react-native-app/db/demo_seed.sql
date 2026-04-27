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

  -- 5 annonces de demo (statut paid pour etre visibles publiquement)
  insert into public.properties
    (owner_id, title, location, type, status, price, bedrooms, bathrooms, area,
     description, image, images, payment_status, posted_at)
  values
    (uid_owner, 'Villa moderne Petion-Ville', 'Petion-Ville, Haiti', 'Villa', 'sale', 285000,
     4, 3, 220, 'Villa demo - 4 chambres, piscine, vue panoramique sur la ville.',
     'https://picsum.photos/seed/orizon-villa/800/600',
     '["https://picsum.photos/seed/orizon-villa/800/600","https://picsum.photos/seed/orizon-villa2/800/600"]'::jsonb,
     'paid', now() - interval '2 days'),
    (uid_owner, 'Appartement centre-ville', 'Port-au-Prince, Haiti', 'Appartement', 'rent', 850,
     2, 1, 75, 'Appartement demo - 2 chambres meuble, securise, internet inclus.',
     'https://picsum.photos/seed/orizon-appart/800/600',
     '["https://picsum.photos/seed/orizon-appart/800/600"]'::jsonb,
     'paid', now() - interval '5 days'),
    (uid_agency, 'Penthouse de luxe Kenscoff', 'Kenscoff, Haiti', 'Penthouse', 'sale', 520000,
     5, 4, 380, 'Penthouse demo - terrasse 100m2, jacuzzi, vue mer.',
     'https://picsum.photos/seed/orizon-pent/800/600',
     '["https://picsum.photos/seed/orizon-pent/800/600","https://picsum.photos/seed/orizon-pent2/800/600","https://picsum.photos/seed/orizon-pent3/800/600"]'::jsonb,
     'paid', now() - interval '1 day'),
    (uid_agency, 'Studio Cap-Haitien', 'Cap-Haitien, Haiti', 'Studio', 'rent', 350,
     1, 1, 32, 'Studio demo - proche universite, ideal etudiant.',
     'https://picsum.photos/seed/orizon-studio/800/600',
     '["https://picsum.photos/seed/orizon-studio/800/600"]'::jsonb,
     'paid', now() - interval '3 days'),
    (uid_agency, 'Terrain constructible Tabarre', 'Tabarre, Haiti', 'Terrain', 'sale', 75000,
     0, 0, 1200, 'Terrain demo - viabilise, acces route asphaltee.',
     'https://picsum.photos/seed/orizon-terrain/800/600',
     '["https://picsum.photos/seed/orizon-terrain/800/600"]'::jsonb,
     'paid', now() - interval '10 days');

  raise notice 'Seed demo OK - 3 users + 5 properties';
end $$;
