-- Patch - Securise les documents KYC (piece d'identite + selfie).
--
-- PROBLEME CORRIGE :
-- 1) Les documents KYC (CIN/passeport/selfie) etaient uploades dans le bucket
--    'property-images', qui est PUBLIC (lecture libre pour n'importe qui avec
--    l'URL). Des documents d'identite sensibles etaient donc potentiellement
--    accessibles sans authentification. On les deplace vers un bucket prive
--    dedie 'kyc-docs'.
-- 2) La table kyc_submissions n'avait que des policies "self" (l'utilisateur
--    ne voit que son propre dossier). Aucune policy ne permettait a un admin
--    de lire/mettre a jour les dossiers des AUTRES utilisateurs : le tableau
--    KYC du dashboard admin ne remontait donc aucune vraie donnee en
--    production (RLS filtrait tout sauf les dossiers de l'admin lui-meme).
--
-- Idempotent. A executer dans Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- 1) Bucket prive 'kyc-docs'
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('kyc-docs', 'kyc-docs', false)
on conflict (id) do update set public = false;

-- Lecture : le proprietaire du dossier (folder = kyc/<user_id>/...) ou un admin.
drop policy if exists "kyc_docs_read_self_or_admin" on storage.objects;
create policy "kyc_docs_read_self_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'kyc-docs'
    and (
      (storage.foldername(name))[1] = 'kyc'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or exists (
      select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin'
    )
  );

-- Insertion : uniquement dans son propre dossier kyc/<user_id>/...
drop policy if exists "kyc_docs_insert_self" on storage.objects;
create policy "kyc_docs_insert_self"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-docs'
    and (storage.foldername(name))[1] = 'kyc'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Suppression : le proprietaire du fichier.
drop policy if exists "kyc_docs_delete_self" on storage.objects;
create policy "kyc_docs_delete_self"
  on storage.objects for delete
  using (bucket_id = 'kyc-docs' and owner = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2) RLS manquante sur kyc_submissions : lecture + mise a jour admin.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "kyc_admin_read_all" on public.kyc_submissions;
create policy "kyc_admin_read_all"
  on public.kyc_submissions for select
  using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin')
  );

drop policy if exists "kyc_admin_update" on public.kyc_submissions;
create policy "kyc_admin_update"
  on public.kyc_submissions for update
  using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin')
  );
