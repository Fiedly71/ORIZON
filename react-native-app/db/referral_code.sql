-- ============================================
-- ORIZON - Code de parrainage / influenceur (optionnel)
-- ============================================
-- Permet a un proprio/agence d'indiquer a l'inscription le code de
-- l'influenceur ou de la personne qui l'a referee. Sert au reporting
-- interne (qui amene combien de comptes).
-- A executer dans le SQL Editor de Supabase.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

COMMENT ON COLUMN public.profiles.referral_code IS
  'Code de parrainage / influenceur saisi a l''inscription (optionnel).';

CREATE INDEX IF NOT EXISTS profiles_referral_code_idx
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;
