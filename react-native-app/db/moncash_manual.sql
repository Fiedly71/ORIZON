-- Patch 19 - Paiement MonCash manuel avec validation admin.
-- Modele : client paye sur MonCash 39934388, soumet ref+phone, admin valide.

-- 1) Ajout des colonnes specifiques MonCash sur payments
do $$
begin
  begin alter table public.payments add column if not exists moncash_reference text; exception when others then null; end;
  begin alter table public.payments add column if not exists moncash_phone text; exception when others then null; end;
  begin alter table public.payments add column if not exists rejection_reason text; exception when others then null; end;
  begin alter table public.payments add column if not exists rejected_at timestamptz; exception when others then null; end;
  begin alter table public.payments add column if not exists refunded boolean default false; exception when others then null; end;
  begin alter table public.payments add column if not exists refund_reason text; exception when others then null; end;
  begin alter table public.payments add column if not exists refunded_at timestamptz; exception when others then null; end;
  begin alter table public.payments add column if not exists method text; exception when others then null; end;
end $$;

-- 2) Reference MonCash unique : empeche double soumission
create unique index if not exists payments_moncash_ref_uniq
  on public.payments(moncash_reference)
  where moncash_reference is not null;

-- 3) Index pour les recherches admin
create index if not exists payments_pending_idx on public.payments(status, created_at desc)
  where status = 'pending';

-- 4) Admin policy : peut tout lire et tout modifier sur payments
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all"
  on public.payments for all
  using (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5) RPC pour soumettre un paiement MonCash (rate limit cote app)
create or replace function public.submit_moncash_payment(
  p_property_id uuid,
  p_amount      numeric,
  p_currency    text,
  p_purpose     text,
  p_reference   text,
  p_phone       text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pending_count int;
  v_payment_id uuid;
begin
  if v_uid is null then
    raise exception 'Non authentifie';
  end if;

  -- Anti-fraude : max 3 paiements pendants par user
  select count(*) into v_pending_count
    from public.payments
   where user_id = v_uid and status = 'pending';
  if v_pending_count >= 3 then
    raise exception 'Tu as deja 3 paiements en attente de validation. Attends qu''ils soient traites.';
  end if;

  -- Reference deja utilisee ?
  if exists(select 1 from public.payments where moncash_reference = p_reference) then
    raise exception 'Cette reference MonCash a deja ete soumise.';
  end if;

  insert into public.payments(
    user_id, property_id, provider, method, purpose,
    amount, currency, status,
    moncash_reference, moncash_phone, reference
  ) values (
    v_uid, p_property_id, 'moncash', 'moncash', coalesce(p_purpose, 'listing'),
    p_amount, coalesce(p_currency, 'HTG'), 'pending',
    p_reference, p_phone, p_reference
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

grant execute on function public.submit_moncash_payment(uuid, numeric, text, text, text, text) to authenticated;

-- 6) RPC approbation admin (active la propriete liee si applicable)
create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not v_is_admin then
    raise exception 'Reserve aux administrateurs';
  end if;

  perform public.confirm_payment(p_payment_id);
end;
$$;

grant execute on function public.approve_payment(uuid) to authenticated;

-- 7) RPC rejet admin
create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
  if not v_is_admin then
    raise exception 'Reserve aux administrateurs';
  end if;

  update public.payments
     set status = 'failed',
         rejection_reason = p_reason,
         rejected_at = now()
   where id = p_payment_id
     and status = 'pending';
end;
$$;

grant execute on function public.reject_payment(uuid, text) to authenticated;
