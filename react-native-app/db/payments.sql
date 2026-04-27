-- ORIZON - table 'payments': historique des paiements (Stripe + MonCash).
create table if not exists public.payments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  property_id   uuid references public.properties(id) on delete set null,
  provider      text not null,          -- 'stripe' | 'moncash' | 'mock'
  purpose       text not null default 'listing', -- 'listing' | 'subscription' | 'boost'
  amount        numeric not null,
  currency      text not null default 'USD',  -- 'USD' | 'HTG'
  status        text not null default 'pending', -- pending | succeeded | failed | refunded
  reference     text,                   -- payment_intent_id (Stripe) ou orderId (MonCash)
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  confirmed_at  timestamptz
);

-- Migration douce
do $$
begin
  begin alter table public.payments add column if not exists purpose text default 'listing'; exception when others then null; end;
  begin alter table public.payments add column if not exists confirmed_at timestamptz; exception when others then null; end;
end $$;

create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_property_idx on public.payments(property_id);

alter table public.payments enable row level security;

drop policy if exists "payments_self_read" on public.payments;
create policy "payments_self_read"
  on public.payments for select
  using (user_id = auth.uid());

drop policy if exists "payments_self_insert" on public.payments;
create policy "payments_self_insert"
  on public.payments for insert
  with check (user_id = auth.uid());

drop policy if exists "payments_self_update" on public.payments;
create policy "payments_self_update"
  on public.payments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ajout du champ payment_status sur properties: les annonces ne sont
-- visibles publiquement qu'apres paiement confirme.
do $$
begin
  begin alter table public.properties add column if not exists payment_status text default 'unpaid'; exception when others then null; end;
  begin alter table public.properties add column if not exists payment_id uuid references public.payments(id) on delete set null; exception when others then null; end;
  begin alter table public.properties add column if not exists published_at timestamptz; exception when others then null; end;
end $$;

create index if not exists properties_payment_status_idx on public.properties(payment_status);

-- On retravaille la policy SELECT: public ne voit que les annonces payees,
-- mais le proprietaire voit toutes les siennes (meme unpaid).
drop policy if exists "properties_select_all" on public.properties;
drop policy if exists "properties_select_paid_or_owner" on public.properties;
create policy "properties_select_paid_or_owner"
  on public.properties for select
  using (
    payment_status = 'paid'
    or owner_id = auth.uid()
  );

-- Table subscriptions: abonnements agence (Patch 7), pose les bases.
create table if not exists public.subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan          text not null,          -- 'agency_basic' | 'agency_pro'
  status        text not null default 'active',  -- active | cancelled | past_due
  provider      text,
  reference     text,
  current_period_end timestamptz,
  created_at    timestamptz default now()
);

create index if not exists subs_user_idx on public.subscriptions(user_id);
create index if not exists subs_status_idx on public.subscriptions(status);

alter table public.subscriptions enable row level security;

drop policy if exists "subs_self_rw" on public.subscriptions;
create policy "subs_self_rw"
  on public.subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper pour confirmer un paiement et basculer la propriete en 'paid'
-- (utilise par le webhook ou par le service client en mock).
create or replace function public.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_property_id uuid;
begin
  update public.payments
     set status = 'succeeded',
         confirmed_at = now()
   where id = p_payment_id
     and status = 'pending'
   returning property_id into v_property_id;

  if v_property_id is not null then
    update public.properties
       set payment_status = 'paid',
           payment_id = p_payment_id,
           published_at = now()
     where id = v_property_id;
  end if;
end;
$$;

grant execute on function public.confirm_payment(uuid) to authenticated;

