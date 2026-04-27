-- Patch 13 - Suppression de compte (Apple App Store 5.1.1v + RGPD)
-- Idempotent.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  requested_at timestamptz default now(),
  processed_at timestamptz,
  status text default 'pending' -- pending | done
);

alter table public.account_deletion_requests enable row level security;

drop policy if exists del_self_insert on public.account_deletion_requests;
create policy del_self_insert on public.account_deletion_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists del_self_select on public.account_deletion_requests;
create policy del_self_select on public.account_deletion_requests
  for select using (auth.uid() = user_id);

-- RPC: anonymise immediatement le profil + marque les annonces archived
-- + insere une demande de suppression du auth.users a traiter dans 30 jours
-- (cron / edge function) pour respecter la fenetre de retractation legale.
create or replace function public.request_account_deletion(p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Anonymise immediatement le profil visible
  update public.profiles set
    full_name = 'Compte supprime',
    phone = null,
    avatar_url = null,
    agency_name = null,
    address = null,
    bio = null,
    verified = false,
    can_publish = false
  where id = uid;

  -- Archive les annonces (ne supprime pas pour preserver l'historique paiements)
  update public.properties set
    payment_status = 'archived',
    title = 'Annonce retiree'
  where owner_id = uid;

  -- Anonymise les avis laisses
  update public.reviews set
    content = '[supprime]',
    title = ''
  where author_id = uid;

  -- Cree la demande (le purge definitif sera fait par un job admin / supabase admin API)
  insert into public.account_deletion_requests(user_id, reason)
  values (uid, p_reason);
end;
$$;

grant execute on function public.request_account_deletion(text) to authenticated;
