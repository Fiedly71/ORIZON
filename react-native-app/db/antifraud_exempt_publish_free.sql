-- Exempte les comptes publish_free=true et admin du trigger anti-doublon.
-- A executer dans Dashboard > SQL Editor.
CREATE OR REPLACE FUNCTION public.check_property_duplicate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  sig text;
  dup_count int;
  v_free boolean;
  v_role text;
BEGIN
  sig := public.property_signature(new.title, new.location, new.price);
  new.signature := sig;

  -- Exempter publish_free et admins du dedup
  IF new.owner_id IS NOT NULL THEN
    SELECT publish_free, role INTO v_free, v_role
    FROM public.profiles WHERE id = new.owner_id;
    IF v_free = true OR v_role = 'admin' THEN
      RETURN new;
    END IF;
  END IF;

  SELECT count(*) INTO dup_count
  FROM public.properties
  WHERE signature = sig
    AND owner_id <> new.owner_id
    AND created_at > now() - interval '30 days';

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Annonce similaire deja publiee recemment. Si tu es le proprietaire legitime, contacte le support.'
      USING errcode = 'P0002';
  END IF;
  RETURN new;
END $$;
