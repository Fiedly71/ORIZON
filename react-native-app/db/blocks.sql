-- Patch 14 - Blocage d'utilisateurs (Apple App Store guideline 1.2 UGC)
-- Idempotent.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create index if not exists ix_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists ix_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists blocks_self_select on public.user_blocks;
create policy blocks_self_select on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists blocks_self_insert on public.user_blocks;
create policy blocks_self_insert on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists blocks_self_delete on public.user_blocks;
create policy blocks_self_delete on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- Vue: properties visibles (exclut les annonces des users que je bloque)
create or replace view public.properties_visible as
select p.* from public.properties p
where not exists (
  select 1 from public.user_blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = p.owner_id
);

grant select on public.properties_visible to authenticated, anon;
