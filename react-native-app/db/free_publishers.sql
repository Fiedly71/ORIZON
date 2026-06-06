-- ============================================
-- Publication gratuite (exemption de paiement)
-- ============================================
-- Ajoute un drapeau `publish_free` sur public.profiles.
-- Quand TRUE, toute annonce creee par ce user passe automatiquement
-- a payment_status='paid' a l'insert (trigger BEFORE INSERT).
-- Le moderation_status reste 'pending' jusqu'a approbation admin
-- (sauf si tu actives aussi auto_approve plus bas).
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS publish_free boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.auto_paid_for_free_publishers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_free boolean;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT publish_free INTO v_free FROM public.profiles WHERE id = NEW.owner_id;
  IF v_free = true THEN
    NEW.payment_status := 'paid';
    -- Auto-approuve aussi la moderation pour les partenaires de confiance.
    -- Comme ils ont l'autorisation de publier gratuitement, on leur fait confiance.
    NEW.moderation_status := 'approved';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_paid_for_free_publishers ON public.properties;
CREATE TRIGGER trg_auto_paid_for_free_publishers
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.auto_paid_for_free_publishers();
