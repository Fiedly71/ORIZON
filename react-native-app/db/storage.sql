-- ORIZON - Supabase Storage: bucket property-images (public read)
-- A executer apres properties.sql.

-- Bucket public en lecture, ecriture restreinte aux utilisateurs authentifies.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = excluded.public;

-- Lecture publique (le bucket est deja public, mais on declare la policy explicitement).
drop policy if exists "property_images_read" on storage.objects;
create policy "property_images_read"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- Insertion: utilisateurs authentifies.
drop policy if exists "property_images_insert" on storage.objects;
create policy "property_images_insert"
  on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.uid() is not null);

-- Suppression: uniquement le proprietaire de l'objet (owner = auth.uid()).
drop policy if exists "property_images_delete" on storage.objects;
create policy "property_images_delete"
  on storage.objects for delete
  using (bucket_id = 'property-images' and owner = auth.uid());
