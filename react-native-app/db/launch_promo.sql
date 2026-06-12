-- ============================================
-- ORIZON - Promo de lancement : publication gratuite 15-30 juin 2026
-- ============================================
-- Du 2026-06-15 (00:00) au 2026-07-01 (00:00) exclusif, toute annonce inseree
-- est automatiquement marquee payee et approuvee, peu importe le profil.
-- Apres le 1er juillet 2026, le trigger redevient transparent et le flow
-- payant MonCash standard reprend.
-- A executer dans le SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.auto_paid_for_launch_promo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF now() >= timestamptz '2026-06-15 00:00:00+00'
     AND now() <  timestamptz '2026-07-01 00:00:00+00' THEN
    NEW.payment_status   := 'paid';
    NEW.moderation_status := 'approved';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_paid_for_launch_promo ON public.properties;
CREATE TRIGGER trg_auto_paid_for_launch_promo
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.auto_paid_for_launch_promo();
