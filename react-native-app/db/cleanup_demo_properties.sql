-- ORIZON - Nettoyage des annonces de demo / test AI.
-- A executer une seule fois dans Supabase Dashboard > SQL Editor
-- (utilise le role service_role du SQL Editor, donc bypass RLS).
--
-- Conserve uniquement la propriete de pierrea503@gmail.com (Pierre Alex).
-- Supprime tous les autres seeds + tests + demo_proprio + demo_agence.
--
-- BACKUP: le SQL Editor de Supabase permet un rollback via transaction.
-- Cette version wrap tout dans une transaction pour valider avant commit.

begin;

-- 1) Recuperer l'UUID a garder (Pierre Alex - pierrea503@gmail.com)
--    Modifie l'email si besoin.
do $$
declare
  keep_id uuid := (select id from auth.users where lower(email) = 'pierrea503@gmail.com' limit 1);
  deleted_props int;
  deleted_media int := 0;
begin
  if keep_id is null then
    raise exception 'Utilisateur pierrea503@gmail.com introuvable dans auth.users. Verifie l''email.';
  end if;

  -- 2) Nettoyage cascade : donnees liees aux annonces qu'on va supprimer.
  --    On isole d'abord les IDs a supprimer.
  create temp table _to_delete on commit drop as
    select id from public.properties
    where owner_id is distinct from keep_id;

  raise notice 'Annonces a supprimer : %', (select count(*) from _to_delete);
  raise notice 'Annonce a conserver : %', (
    select coalesce((select title from public.properties where owner_id = keep_id limit 1), '(aucune)')
  );

  -- Enfants dependants (best-effort - on ignore si la table n'existe pas)
  begin
    delete from public.property_media where property_id in (select id from _to_delete);
    get diagnostics deleted_media = row_count;
  exception when undefined_table then null;
  end;

  begin delete from public.reviews         where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.favorites       where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.visits          where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.reports         where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.price_history   where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.property_views  where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.messages        where conversation_id in (
          select id from public.conversations where property_id in (select id from _to_delete)
        ); exception when undefined_table then null; end;
  begin delete from public.conversations   where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.alerts          where property_id in (select id from _to_delete); exception when undefined_table then null; end;
  begin delete from public.payments        where property_id in (select id from _to_delete); exception when undefined_table then null; end;

  -- 3) Suppression des proprietes
  delete from public.properties where id in (select id from _to_delete);
  get diagnostics deleted_props = row_count;

  raise notice 'OK - % annonces supprimees (% medias associes).', deleted_props, deleted_media;
end $$;

-- 4) Verification finale : lister ce qui reste
select id, title, location, owner_name, posted_at, payment_status
from public.properties
order by created_at desc;

-- Si le resultat est OK (uniquement Pierre Alex), remplace ROLLBACK par COMMIT ci-dessous.
-- Par defaut on ROLLBACK pour dry-run : re-execute le script en changeant la ligne pour valider.
rollback;
-- commit;
