-- ============================================
-- ORIZON - Ajoute email + banned aux profiles pour le dashboard admin.
-- A executer dans Supabase Dashboard > SQL Editor.
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- Backfill : copie l'email depuis auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Trigger : garde l'email synchronise quand l'auth.users.email change.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- RLS : un admin peut tout lire (necessaire pour le dashboard admin).
-- Si tu as deja une policy admin-read globale, ce DROP/CREATE est idempotent.
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid() AND me.role = 'admin'
  )
);

-- RLS : un admin peut bannir/debannir (update banned).
DROP POLICY IF EXISTS "admins can ban users" ON public.profiles;
CREATE POLICY "admins can ban users" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid() AND me.role = 'admin'
  )
);
