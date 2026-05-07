-- antifraud.sql - Filtres anti-arnaque cote serveur
-- 1) Bloque les patterns tel/email/whatsapp dans le body des messages
-- 2) Detecte les doublons d'annonces (hash titre + adresse + prix)

-- ============ MESSAGES ============
create or replace function public.sanitize_message_body()
returns trigger language plpgsql as $$
declare
  blocked text[] := array[
    '\+?\d[\d\s\-\.\(\)]{6,}\d',           -- numero tel 7+ chiffres
    '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', -- email
    '(wa\.me|whatsapp|viber|telegram|signal|messenger)', -- apps externes
    '(facebook\.com|instagram\.com|tiktok\.com)/[^\s]+'  -- social
  ];
  pat text;
begin
  foreach pat in array blocked loop
    if new.body ~* pat then
      raise exception 'Message refuse : echange de coordonnees externes interdit. Utilise la messagerie ORIZON.'
        using errcode = 'P0001';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists messages_sanitize on public.messages;
create trigger messages_sanitize
  before insert on public.messages
  for each row execute function public.sanitize_message_body();

-- ============ ANNONCES DOUBLONS ============
-- Hash deterministe titre+location+price pour detecter republication scam
create or replace function public.property_signature(
  p_title text, p_location text, p_price numeric
) returns text language sql immutable as $$
  select md5(
    lower(coalesce(regexp_replace(p_title, '\s+', '', 'g'), '')) || '|' ||
    lower(coalesce(regexp_replace(p_location, '\s+', '', 'g'), '')) || '|' ||
    coalesce(p_price::text, '')
  );
$$;

-- Colonne signature
alter table public.properties add column if not exists signature text;
create index if not exists properties_sig_idx on public.properties(signature);

-- Trigger : remplit la signature et bloque doublons d'autres users < 30j
create or replace function public.check_property_duplicate()
returns trigger language plpgsql as $$
declare
  sig text;
  dup_count int;
begin
  sig := public.property_signature(new.title, new.location, new.price);
  new.signature := sig;

  select count(*) into dup_count
  from public.properties
  where signature = sig
    and owner_id <> new.owner_id
    and created_at > now() - interval '30 days';

  if dup_count > 0 then
    raise exception 'Annonce similaire deja publiee recemment. Si tu es le proprietaire legitime, contacte le support.'
      using errcode = 'P0002';
  end if;
  return new;
end $$;

drop trigger if exists properties_dedup on public.properties;
create trigger properties_dedup
  before insert on public.properties
  for each row execute function public.check_property_duplicate();
