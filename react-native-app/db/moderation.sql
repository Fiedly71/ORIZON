-- ORIZON - Patch 9 - Moderation reviews/photos + queue admin.
-- Idempotent.

-- IMPORTANT: ajouter is_admin AVANT toute policy qui le reference.
do $$
begin
  begin alter table public.profiles add column if not exists is_admin boolean default false; exception when others then null; end;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 1) On rebascule reviews en moderation manuelle (status=pending par defaut),
--    avec auto-approbation si pas de mot interdit (cote client + trigger).
-- ─────────────────────────────────────────────────────────────
do $$
begin
  begin alter table public.reviews alter column status set default 'pending'; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderation_reason text; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderated_at timestamptz; exception when others then null; end;
  begin alter table public.reviews add column if not exists moderated_by uuid references auth.users(id); exception when others then null; end;
end $$;

-- Liste de mots interdits simple (extensible).
create table if not exists public.banned_words (
  word text primary key
);

insert into public.banned_words(word) values
  ('arnaque'), ('escroquerie'), ('voleur'), ('fraude'),
  ('insulte'), ('connard'), ('salope'), ('pute'),
  ('scam'), ('fraud'), ('thief')
on conflict do nothing;

-- Trigger: auto-flag review si contient un mot interdit.
create or replace function public.review_auto_moderate()
returns trigger
language plpgsql
as $$
declare
  v_hit text;
begin
  select w.word into v_hit
    from public.banned_words w
   where lower(coalesce(NEW.content, '')) like '%' || w.word || '%'
   limit 1;
  if v_hit is not null then
    NEW.status := 'flagged';
    NEW.moderation_reason := 'banned_word: ' || v_hit;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_review_auto_moderate on public.reviews;
create trigger trg_review_auto_moderate
  before insert on public.reviews
  for each row execute procedure public.review_auto_moderate();

-- ─────────────────────────────────────────────────────────────
-- 2) Queue moderation des photos (etat: pending/approved/rejected).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.photo_moderation (
  id          bigserial primary key,
  property_id uuid references public.properties(id) on delete cascade,
  url         text not null,
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'pending',  -- pending | approved | rejected
  reason      text,
  created_at  timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists photo_mod_status_idx on public.photo_moderation(status, created_at desc);
create index if not exists photo_mod_prop_idx on public.photo_moderation(property_id);

alter table public.photo_moderation enable row level security;

-- Insert: l'utilisateur connecte peut soumettre ses propres photos.
drop policy if exists "photo_mod_insert_self" on public.photo_moderation;
create policy "photo_mod_insert_self"
  on public.photo_moderation for insert
  with check (user_id = auth.uid());

-- Read: l'utilisateur voit ses propres soumissions; admin voit tout (via role).
drop policy if exists "photo_mod_read_self" on public.photo_moderation;
create policy "photo_mod_read_self"
  on public.photo_moderation for select
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Update reserve aux admins.
drop policy if exists "photo_mod_update_admin" on public.photo_moderation;
create policy "photo_mod_update_admin"
  on public.photo_moderation for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- ─────────────────────────────────────────────────────────────
-- 3) Champ is_admin sur profiles (pour la console admin future).
-- ─────────────────────────────────────────────────────────────
do $$
begin
  begin alter table public.profiles add column if not exists is_admin boolean default false; exception when others then null; end;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4) Reviews: lecture publique limitee aux 'approved'; le owner voit aussi 'pending'/'flagged'.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_select_approved_or_owner" on public.reviews;
create policy "reviews_select_approved_or_owner"
  on public.reviews for select
  using (
    status = 'approved'
    or author_id = auth.uid()
    or exists (
      select 1 from public.properties p
       where p.id = property_id and p.owner_id = auth.uid()
    )
  );
