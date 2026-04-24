-- ORIZON - table push_tokens pour Expo Push Notifications.
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  platform    text,
  updated_at  timestamptz default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_self_rw" on public.push_tokens;
create policy "push_tokens_self_rw"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
