-- support_tickets.sql - Tickets support clients
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists st_owner_select on public.support_tickets;
drop policy if exists st_owner_insert on public.support_tickets;
drop policy if exists st_admin_all on public.support_tickets;

create policy st_owner_select on public.support_tickets for select
  using (auth.uid() = user_id);

create policy st_owner_insert on public.support_tickets for insert
  with check (auth.uid() = user_id or user_id is null);

create policy st_admin_all on public.support_tickets for all
  using (public.is_admin())
  with check (public.is_admin());
