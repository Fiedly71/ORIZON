-- Patch 25 - Alertes admin automatiques.
--
-- Cr\u00e9e une table admin_alerts + 2 triggers :
--   1) Apr\u00e8s INSERT sur reports \u2014 si un bien atteint 10 signalements (status
--      not resolved), on cr\u00e9e une alerte "many_reports" pour ce bien.
--   2) Apr\u00e8s INSERT sur reviews (approved) avec rating <= 2 \u2014 si un bien
--      atteint 10 avis n\u00e9gatifs, on cr\u00e9e une alerte "many_low_reviews".
--
-- Les alertes sont d\u00e9dupliqu\u00e9es via unique(target_type, target_id, kind, resolved_at is null).
-- Un admin les voit sur son dashboard et peut les r\u00e9soudre (resolve_admin_alert).
--
-- Idempotent.

create table if not exists public.admin_alerts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('many_reports','many_low_reviews','many_reports_user')),
  target_type  text not null check (target_type in ('property','user','review')),
  target_id    uuid not null,
  threshold    int not null,
  actual_count int not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id),
  notes        text
);

create index if not exists admin_alerts_open_idx on public.admin_alerts(created_at desc)
  where resolved_at is null;

-- Unicit\u00e9 des alertes ouvertes : m\u00eame (kind, target) => 1 seule ligne active.
create unique index if not exists admin_alerts_dedupe_open
  on public.admin_alerts(kind, target_type, target_id)
  where resolved_at is null;

alter table public.admin_alerts enable row level security;

do $$
begin
  begin
    create policy "admin_alerts_admin_read" on public.admin_alerts
      for select using (
        exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
      );
  exception when duplicate_object then null; end;
  begin
    create policy "admin_alerts_admin_write" on public.admin_alerts
      for update using (
        exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
      );
  exception when duplicate_object then null; end;
end $$;

-- ── Trigger 1 : 10 signalements sur une m\u00eame annonce ─────────────
create or replace function public.check_reports_threshold()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_target_type text;
  v_target_id uuid;
  v_threshold int := 10;
begin
  -- On ne cible que les signalements sur PROPERTY ou USER (reports.target_type existe).
  v_target_type := coalesce(new.target_type, 'property');
  v_target_id   := coalesce(new.target_id, new.property_id);
  if v_target_id is null then return new; end if;

  select count(*) into v_count
    from public.reports
   where coalesce(target_type, 'property') = v_target_type
     and coalesce(target_id, property_id) = v_target_id
     and (status is null or status <> 'resolved');

  if v_count >= v_threshold then
    insert into public.admin_alerts (kind, target_type, target_id, threshold, actual_count)
    values (
      case when v_target_type = 'user' then 'many_reports_user' else 'many_reports' end,
      v_target_type, v_target_id, v_threshold, v_count
    )
    on conflict (kind, target_type, target_id) where resolved_at is null
    do update set actual_count = excluded.actual_count;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_check_threshold on public.reports;
create trigger on_report_check_threshold
  after insert on public.reports
  for each row execute procedure public.check_reports_threshold();

-- ── Trigger 2 : 10 avis \u2264 2 \u00e9toiles approuv\u00e9s ────────────────────
create or replace function public.check_low_reviews_threshold()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_threshold int := 10;
begin
  if new.status <> 'approved' then return new; end if;
  if new.rating is null or new.rating > 2 then return new; end if;
  if new.property_id is null then return new; end if;

  select count(*) into v_count
    from public.reviews
   where property_id = new.property_id
     and status = 'approved'
     and rating <= 2;

  if v_count >= v_threshold then
    insert into public.admin_alerts (kind, target_type, target_id, threshold, actual_count)
    values ('many_low_reviews', 'property', new.property_id, v_threshold, v_count)
    on conflict (kind, target_type, target_id) where resolved_at is null
    do update set actual_count = excluded.actual_count;
  end if;
  return new;
end;
$$;

-- On d\u00e9clenche aussi sur UPDATE (quand un avis passe en 'approved' via moderation).
drop trigger if exists on_review_check_threshold on public.reviews;
create trigger on_review_check_threshold
  after insert or update of status on public.reviews
  for each row execute procedure public.check_low_reviews_threshold();

-- ── Fonction admin : r\u00e9soudre une alerte ───────────────────────────
create or replace function public.resolve_admin_alert(p_alert_id uuid, p_notes text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Acc\u00e8s admin requis';
  end if;
  update public.admin_alerts
     set resolved_at = now(),
         resolved_by = auth.uid(),
         notes = coalesce(p_notes, notes)
   where id = p_alert_id;
end;
$$;

grant execute on function public.resolve_admin_alert(uuid, text) to authenticated;
