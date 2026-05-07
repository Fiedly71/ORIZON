-- messages.sql - Messages d'une conversation
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists msg_conv_idx on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists msg_select_member on public.messages;
create policy msg_select_member on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

drop policy if exists msg_insert_member on public.messages;
create policy msg_insert_member on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- Trigger: maj last_message + compteurs unread
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations
  set last_message = new.body,
      last_sender_id = new.sender_id,
      last_message_at = new.created_at,
      unread_buyer = case when new.sender_id = buyer_id then unread_buyer else unread_buyer + 1 end,
      unread_owner = case when new.sender_id = owner_id then unread_owner else unread_owner + 1 end
  where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_touch_conv on public.messages;
create trigger messages_touch_conv
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
