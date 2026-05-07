-- conversations.sql - Conversations 1:1 entre acheteur et proprietaire
-- Une conversation est rattachee optionnellement a une property.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  last_message text,
  last_sender_id uuid,
  last_message_at timestamptz,
  unread_buyer int not null default 0,
  unread_owner int not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id, owner_id)
);

create index if not exists conv_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index if not exists conv_owner_idx on public.conversations(owner_id, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists conv_select_own on public.conversations;
create policy conv_select_own on public.conversations
  for select using (auth.uid() = buyer_id or auth.uid() = owner_id);

drop policy if exists conv_insert_buyer on public.conversations;
create policy conv_insert_buyer on public.conversations
  for insert with check (auth.uid() = buyer_id);

drop policy if exists conv_update_own on public.conversations;
create policy conv_update_own on public.conversations
  for update using (auth.uid() = buyer_id or auth.uid() = owner_id);
