-- ============================================
-- Notifications push automatiques via triggers DB.
-- Necessite la fonction Edge "send-push" deployee.
-- Configure d'abord :
--   SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push', 'send_push_url');
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- ============================================

-- Active l'extension http si pas deja fait
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- Trigger 1 : nouveau message -> notify le destinataire
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv RECORD;
  v_recipient UUID;
  v_sender_name TEXT;
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_recipient := CASE WHEN NEW.sender_id = v_conv.buyer_id THEN v_conv.owner_id ELSE v_conv.buyer_id END;

  SELECT COALESCE(full_name, agency_name, 'Quelqu''un') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  -- Recupere l'URL Edge + service role depuis vault (a configurer une fois).
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'send_push_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'userIds', jsonb_build_array(v_recipient),
      'title', v_sender_name,
      'body', LEFT(NEW.body, 120),
      'data', jsonb_build_object('type', 'message', 'conversationId', NEW.conversation_id)
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ============================================
-- Trigger 2 : nouvelle propriete approuvee + payee -> notify saved_searches matchantes
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_property_match()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_search RECORD;
  v_url TEXT;
  v_key TEXT;
  v_user_ids UUID[];
BEGIN
  -- Notifier seulement quand l'annonce passe en "live"
  IF NEW.payment_status != 'paid' OR NEW.moderation_status != 'approved' THEN RETURN NEW; END IF;
  IF (OLD.payment_status = 'paid' AND OLD.moderation_status = 'approved') THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'send_push_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN RETURN NEW; END IF;

  -- Cherche les saved_searches qui matchent (filtres simples: type, prix max, location LIKE)
  SELECT ARRAY_AGG(DISTINCT user_id) INTO v_user_ids
  FROM public.saved_searches
  WHERE (criteria->>'type' IS NULL OR criteria->>'type' = NEW.type OR criteria->>'type' = 'Tous')
    AND (criteria->>'maxPrice' IS NULL OR (criteria->>'maxPrice')::numeric >= NEW.price)
    AND (criteria->>'minPrice' IS NULL OR (criteria->>'minPrice')::numeric <= NEW.price)
    AND (criteria->>'location' IS NULL OR NEW.location ILIKE '%' || (criteria->>'location') || '%');

  IF v_user_ids IS NULL OR ARRAY_LENGTH(v_user_ids, 1) = 0 THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'userIds', to_jsonb(v_user_ids),
      'title', 'Nouvelle annonce qui te correspond',
      'body', NEW.title || ' - ' || NEW.location,
      'data', jsonb_build_object('type', 'property', 'propertyId', NEW.id)
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_property_match ON public.properties;
CREATE TRIGGER trg_notify_property_match
AFTER INSERT OR UPDATE OF payment_status, moderation_status ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.notify_property_match();
