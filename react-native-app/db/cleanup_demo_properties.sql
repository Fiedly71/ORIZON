-- ORIZON - Nettoyage des annonces de demo / test AI.
-- A executer dans Supabase Dashboard > SQL Editor.
-- Conserve uniquement la propriete de pierrea503@gmail.com (Pierre Alex).
--
-- MODE : par defaut, ce script fait un DRY-RUN (rollback a la fin).
-- Il affiche la liste des annonces qui seraient supprimees + celles gardees.
-- Pour valider : change la derniere ligne "rollback;" en "commit;" et re-run.

begin;

do $$
declare
  keep_id uuid := (select id from auth.users where lower(email) = 'pierrea503@gmail.com' limit 1);
  deleted_props int := 0;
begin
  if keep_id is null then
    raise exception 'Utilisateur pierrea503@gmail.com introuvable dans auth.users. Verifie l''email.';
  end if;

  -- IDs a supprimer
  create temp table _to_delete on commit drop as
    select id from public.properties
    where owner_id is distinct from keep_id;

  raise notice 'Annonces a supprimer : %', (select count(*) from _to_delete);
  raise notice 'Annonce a conserver : %', (
    select coalesce((select title from public.properties where owner_id = keep_id limit 1), '(aucune)')
  );

  -- Cascade : chaque delete est isole - si la table/colonne n'existe pas, on l'ignore.
  begin execute 'delete from public.property_media  where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip property_media : %', sqlerrm; end;
  begin execute 'delete from public.reviews         where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip reviews : %', sqlerrm; end;
  begin execute 'delete from public.favorites       where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip favorites : %', sqlerrm; end;
  begin execute 'delete from public.visits          where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip visits : %', sqlerrm; end;
  begin execute 'delete from public.price_history   where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip price_history : %', sqlerrm; end;
  begin execute 'delete from public.property_views  where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip property_views : %', sqlerrm; end;
  begin execute 'delete from public.alerts          where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip alerts : %', sqlerrm; end;
  begin execute 'delete from public.payments        where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip payments : %', sqlerrm; end;
  begin execute 'delete from public.saved_searches  where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip saved_searches : %', sqlerrm; end;

  -- reports : cle polymorphique (target_type='property', target_id text)
  begin
    execute $q$
      delete from public.reports
      where target_type = 'property'
        and target_id in (select id::text from _to_delete)
    $q$;
  exception when others then raise notice 'skip reports : %', sqlerrm;
  end;

  -- Messagerie : messages puis conversations liees a une annonce supprimee
  begin execute 'delete from public.messages      where conversation_id in (select id from public.conversations where property_id in (select id from _to_delete))'; exception when others then raise notice 'skip messages : %', sqlerrm; end;
  begin execute 'delete from public.conversations where property_id     in (select id from _to_delete)'; exception when others then raise notice 'skip conversations : %', sqlerrm; end;

  -- Suppression des annonces elles-memes
  delete from public.properties where id in (select id from _to_delete);
  get diagnostics deleted_props = row_count;

  raise notice 'OK - % annonces supprimees.', deleted_props;
end $$;

-- Verification finale : ce qui reste
select id, title, location, owner_name, posted_at, payment_status
from public.properties
order by created_at desc;

-- Change "rollback;" en "commit;" et re-execute pour valider.
rollback;
-- commit;
