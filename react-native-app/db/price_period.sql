-- Patch 23 - Champ price_period sur properties.
--
-- Le proprio choisit lors de SellWizard \u00e9tape 3 comment son prix s'applique :
--   'total'      => Prix total (vente ou location globale)
--   'per_night'  => Par nuit (h\u00f4tel, location courte dur\u00e9e touristique)
--   'per_day'    => Par jour
--   'per_month'  => Par mois (location classique, colocation)
--   'per_year'   => Par ann\u00e9e (bail annuel)
--
-- Choix libre : un h\u00f4tel en 'A louer' + 'per_night', un studio en
-- 'A louer' + 'per_month', une villa vendue en 'A vendre' + 'total', etc.
--
-- Idempotent.

alter table public.properties
  add column if not exists price_period text
  check (price_period in ('total','per_night','per_day','per_month','per_year'));

-- Backfill : les annonces existantes prennent 'per_month' si location, sinon 'total'.
update public.properties
   set price_period = case
     when lower(coalesce(status, '')) like '%louer%'
       or lower(coalesce(status, '')) like '%lwe%'
       or lower(coalesce(status, '')) like '%rent%' then 'per_month'
     else 'total'
   end
 where price_period is null;

comment on column public.properties.price_period is
  'P\u00e9riode tarifaire choisie par le proprio : total / per_night / per_day / per_month / per_year.';
