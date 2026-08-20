-- Patch - Corrige "invalid input syntax for type numeric: """ au moment de
-- publier une annonce.
--
-- Cause racine : des recherches sauvegardees (saved_searches.criteria) ont
-- ete enregistrees avec minPrice/maxPrice/beds/baths = '' (chaine vide) au
-- lieu de null, car le formulaire de filtres avances initialise ces champs
-- a '' quand ils ne sont pas remplis. Le trigger notify_property_match()
-- (declenche des qu'une annonce passe en ligne, ex: publication gratuite)
-- fait `(criteria->>'maxPrice')::numeric`, ce qui echoue si la valeur est
-- '' (une chaine vide n'est PAS `is null` en SQL). Resultat : la publication
-- de N'IMPORTE QUELLE annonce echouait des qu'une seule recherche sauvegardee
-- avait ce probleme.
--
-- Idempotent. A executer dans Supabase SQL Editor.

-- 1) Nettoyage des donnees existantes : remplace les chaines vides par null
--    pour tous les champs numeriques/entiers connus dans criteria.
update public.saved_searches
set criteria = criteria
  - 'minPrice' - 'maxPrice' - 'beds' - 'baths' - 'minBeds' - 'minBaths' - 'minArea' - 'maxArea'
  || jsonb_strip_nulls(jsonb_build_object(
       'minPrice', nullif(criteria->>'minPrice', ''),
       'maxPrice', nullif(criteria->>'maxPrice', ''),
       'beds', nullif(criteria->>'beds', ''),
       'baths', nullif(criteria->>'baths', ''),
       'minBeds', nullif(criteria->>'minBeds', ''),
       'minBaths', nullif(criteria->>'minBaths', ''),
       'minArea', nullif(criteria->>'minArea', ''),
       'maxArea', nullif(criteria->>'maxArea', '')
     ))
where criteria ?| array['minPrice','maxPrice','beds','baths','minBeds','minBaths','minArea','maxArea'];

-- 2) Defense en profondeur : les fonctions qui castent criteria->>'xxx' en
--    numeric/int utilisent desormais nullif(..., '') pour tolerer une
--    chaine vide deja en base (au cas ou une future ecriture buggee en
--    recree), au lieu de planter.

create or replace function public.match_saved_search(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  c jsonb; n int;
begin
  select criteria into c from public.saved_searches where id = p_id;
  if c is null then return 0; end if;
  select count(*) into n from public.properties p
  where p.moderation_status = 'approved'
    and (c->>'type' is null or p.type = c->>'type')
    and (c->>'status' is null or p.status = c->>'status')
    and (nullif(c->>'minPrice', '') is null or p.price >= (nullif(c->>'minPrice', ''))::numeric)
    and (nullif(c->>'maxPrice', '') is null or p.price <= (nullif(c->>'maxPrice', ''))::numeric)
    and (nullif(c->>'beds', '') is null or p.bedrooms >= (nullif(c->>'beds', ''))::int)
    and (nullif(c->>'baths', '') is null or p.bathrooms >= (nullif(c->>'baths', ''))::int)
    and (c->>'q' is null or (p.title ilike '%'||(c->>'q')||'%' or p.description ilike '%'||(c->>'q')||'%'));
  return n;
end $$;

grant execute on function public.match_saved_search(uuid) to authenticated;

create or replace function public.notify_property_match()
returns trigger language plpgsql security definer as $$
declare
  v_search record;
  v_url text;
  v_key text;
  v_user_ids uuid[];
begin
  if new.payment_status != 'paid' or new.moderation_status != 'approved' then return new; end if;
  if (old.payment_status = 'paid' and old.moderation_status = 'approved') then return new; end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'send_push_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if v_url is null or v_key is null then return new; end if;

  select array_agg(distinct user_id) into v_user_ids
  from public.saved_searches
  where (criteria->>'type' is null or criteria->>'type' = new.type or criteria->>'type' = 'Tous')
    and (nullif(criteria->>'maxPrice', '') is null or (nullif(criteria->>'maxPrice', ''))::numeric >= new.price)
    and (nullif(criteria->>'minPrice', '') is null or (nullif(criteria->>'minPrice', ''))::numeric <= new.price)
    and (criteria->>'location' is null or new.location ilike '%' || (criteria->>'location') || '%');

  if v_user_ids is null or array_length(v_user_ids, 1) = 0 then return new; end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'userIds', to_jsonb(v_user_ids),
      'title', 'Nouvelle annonce qui te correspond',
      'body', new.title || ' - ' || new.location,
      'data', jsonb_build_object('type', 'property', 'propertyId', new.id)
    )
  );
  return new;
end $$;

drop trigger if exists trg_notify_property_match on public.properties;
create trigger trg_notify_property_match
after insert or update of payment_status, moderation_status on public.properties
for each row execute function public.notify_property_match();
