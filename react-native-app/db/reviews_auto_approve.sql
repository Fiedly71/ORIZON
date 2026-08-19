-- Patch - Avis publies automatiquement (sans attente d'approbation admin).
--
-- Avant: un avis laisse sous une propriete/agence restait status='pending'
-- jusqu'a validation manuelle par un admin avant d'etre visible publiquement.
-- Maintenant: l'app (reviewsService.js) insere directement en 'approved' des
-- la soumission (sauf contenu detecte comme interdit -> 'flagged', revu par
-- un admin). Ce patch aligne la base :
--  1) Nouveau defaut de colonne 'approved' (au cas ou une insertion ne
--     precise pas status).
--  2) Backfill des avis deja soumis et encore en 'pending' (non flagges) :
--     ils deviennent visibles immediatement.
--
-- Idempotent. A executer dans Supabase SQL Editor.

alter table public.reviews alter column status set default 'approved';

update public.reviews
   set status = 'approved'
 where status = 'pending';
