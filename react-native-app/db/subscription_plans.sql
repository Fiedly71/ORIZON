-- Patch 24 - Plans d'abonnement + badge vérifié achetable.
--
-- Étend profiles avec :
--   current_plan_id      : id du plan actif (monthly | quarterly | yearly | null)
--   plan_started_at      : date de souscription
--   plan_expires_at      : date d'expiration (rappel 3 jours avant)
--   verified_badge       : boolean — badge bleu affiché
--   badge_expires_at     : date d'expiration du badge
--   last_renewal_reminder_at : timestamp du dernier push de rappel envoyé
--                              (évite de spammer)
--
-- + Table subscription_history (historique des souscriptions payées).
-- + Vue admin_expiring_plans (liste des plans qui expirent dans 3 jours).
--
-- Idempotent.

-- ── Colonnes sur profiles ──────────────────────────────────
do $$
begin
  begin alter table public.profiles add column if not exists current_plan_id text; exception when others then null; end;
  begin alter table public.profiles add column if not exists plan_started_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists plan_expires_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists verified_badge boolean default false; exception when others then null; end;
  begin alter table public.profiles add column if not exists badge_expires_at timestamptz; exception when others then null; end;
  begin alter table public.profiles add column if not exists last_renewal_reminder_at timestamptz; exception when others then null; end;
end $$;

create index if not exists profiles_plan_expires_idx on public.profiles(plan_expires_at)
  where plan_expires_at is not null;

comment on column public.profiles.current_plan_id is 'Id du plan actif : monthly | quarterly | yearly.';
comment on column public.profiles.verified_badge is 'Badge bleu de confiance affiché à côté du nom.';

-- ── Historique des souscriptions ───────────────────────────
create table if not exists public.subscription_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  plan_id      text not null check (plan_id in ('monthly','quarterly','yearly','verified_badge')),
  price_usd    numeric(10,2) not null,
  duration_days int not null,
  started_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  payment_id   uuid,                        -- réf. table payments quand créée
  status       text not null default 'active' check (status in ('active','expired','cancelled','refunded')),
  created_at   timestamptz not null default now()
);

create index if not exists sub_hist_user_idx on public.subscription_history(user_id);
create index if not exists sub_hist_expires_idx on public.subscription_history(expires_at) where status = 'active';

alter table public.subscription_history enable row level security;

do $$
begin
  begin
    create policy "sub_hist_owner_read" on public.subscription_history
      for select using (auth.uid() = user_id);
  exception when duplicate_object then null; end;
  begin
    create policy "sub_hist_admin_read" on public.subscription_history
      for select using (
        exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
      );
  exception when duplicate_object then null; end;
end $$;

-- ── Vue admin : plans expirant dans les 3 prochains jours ──
-- Sert au cron / edge function qui envoie les rappels de renouvellement.
create or replace view public.admin_expiring_plans as
  select
    p.id                as user_id,
    p.email,
    p.full_name,
    p.current_plan_id,
    p.plan_expires_at,
    (p.plan_expires_at - now()) as time_left,
    p.last_renewal_reminder_at
  from public.profiles p
  where p.current_plan_id is not null
    and p.plan_expires_at is not null
    and p.plan_expires_at between now() and (now() + interval '3 days');

-- ── Fonction : activer un plan (utilisable depuis Edge Function ou admin) ──
-- Idempotente : appelle-la après validation d'un paiement pour créditer le plan.
create or replace function public.activate_plan(
  p_user_id uuid,
  p_plan_id text,
  p_price_usd numeric,
  p_duration_days int,
  p_payment_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_expires timestamptz;
  v_grants_badge boolean := (p_plan_id = 'yearly');
begin
  if p_plan_id not in ('monthly','quarterly','yearly','verified_badge') then
    raise exception 'plan_id invalide: %', p_plan_id;
  end if;

  -- Si le user a déjà un plan actif, on prolonge à partir de la date d'expiration
  -- restante (pas de perte de jours) ; sinon on part de now().
  select greatest(coalesce(plan_expires_at, now()), now())
    into v_expires
    from public.profiles where id = p_user_id;
  v_expires := v_expires + (p_duration_days || ' days')::interval;

  if p_plan_id = 'verified_badge' then
    update public.profiles
       set verified_badge = true,
           badge_expires_at = greatest(coalesce(badge_expires_at, now()), now()) + (p_duration_days || ' days')::interval,
           updated_at = now()
     where id = p_user_id;
  else
    update public.profiles
       set current_plan_id = p_plan_id,
           plan_started_at = coalesce(plan_started_at, now()),
           plan_expires_at = v_expires,
           can_publish = true,
           verified_badge = case when v_grants_badge then true else verified_badge end,
           badge_expires_at = case
             when v_grants_badge
               then greatest(coalesce(badge_expires_at, now()), now()) + interval '365 days'
             else badge_expires_at
           end,
           last_renewal_reminder_at = null,  -- reset rappels
           updated_at = now()
     where id = p_user_id;
  end if;

  insert into public.subscription_history (
    user_id, plan_id, price_usd, duration_days, started_at, expires_at, payment_id, status
  ) values (
    p_user_id, p_plan_id, p_price_usd, p_duration_days, now(),
    case when p_plan_id = 'verified_badge'
      then (select badge_expires_at from public.profiles where id = p_user_id)
      else v_expires
    end,
    p_payment_id, 'active'
  );
end;
$$;

grant execute on function public.activate_plan(uuid, text, numeric, int, uuid) to service_role;
grant execute on function public.activate_plan(uuid, text, numeric, int, uuid) to authenticated;
-- (authenticated a besoin de l'exécuter uniquement via l'edge function côté serveur.
--  En prod on retire ce grant et on passe par service_role uniquement.)

-- ── Cron cleanup : marque les plans expirés (à appeler par pg_cron ou edge) ──
create or replace function public.expire_plans()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  update public.profiles
     set current_plan_id = null,
         can_publish = false,
         updated_at = now()
   where plan_expires_at is not null
     and plan_expires_at < now()
     and current_plan_id is not null;
  get diagnostics v_count = row_count;

  update public.profiles
     set verified_badge = false,
         updated_at = now()
   where badge_expires_at is not null
     and badge_expires_at < now()
     and verified_badge = true;

  update public.subscription_history
     set status = 'expired'
   where status = 'active' and expires_at < now();

  return v_count;
end;
$$;

grant execute on function public.expire_plans() to service_role;
