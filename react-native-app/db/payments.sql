-- ORIZON - table 'payments': historique des paiements (Stripe + MonCash).
create table if not exists public.payments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  property_id   uuid references public.properties(id) on delete set null,
  provider      text not null,          -- 'stripe' | 'moncash'
  amount        numeric not null,
  currency      text not null default 'USD',
  status        text not null default 'pending', -- pending | succeeded | failed | refunded
  reference     text,                   -- payment_intent_id (Stripe) ou orderId (MonCash)
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

alter table public.payments enable row level security;

drop policy if exists "payments_self_read" on public.payments;
create policy "payments_self_read"
  on public.payments for select
  using (user_id = auth.uid());

drop policy if exists "payments_self_insert" on public.payments;
create policy "payments_self_insert"
  on public.payments for insert
  with check (user_id = auth.uid());
