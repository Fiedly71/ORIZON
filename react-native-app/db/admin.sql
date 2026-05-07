-- admin.sql - Role admin + queue moderation des annonces
-- 1) profiles.role : 'user' | 'agent' | 'agency' | 'admin'
-- 2) annonces ont un moderation_status : pending | approved | rejected
-- 3) Vue admin pour la queue

alter table public.profiles add column if not exists role text not null default 'user'
  check (role in ('user', 'agent', 'agency', 'admin'));

alter table public.properties add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending', 'approved', 'rejected'));
alter table public.properties add column if not exists moderation_reason text;
alter table public.properties add column if not exists moderated_by uuid references auth.users(id);
alter table public.properties add column if not exists moderated_at timestamptz;

create index if not exists prop_mod_status_idx on public.properties(moderation_status, created_at desc);

-- Helper : suis-je admin ?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Politique : seuls admins peuvent UPDATE moderation_status
drop policy if exists prop_admin_moderate on public.properties;
create policy prop_admin_moderate on public.properties
  for update using (public.is_admin())
  with check (public.is_admin());

-- RPC : approuver / rejeter
create or replace function public.moderate_property(
  p_id uuid, p_action text, p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('approved', 'rejected') then raise exception 'invalid action'; end if;
  update public.properties set
    moderation_status = p_action,
    moderation_reason = p_reason,
    moderated_by = auth.uid(),
    moderated_at = now()
  where id = p_id;
end $$;

grant execute on function public.moderate_property(uuid, text, text) to authenticated;

-- Filtre listing public : seules les annonces approved sont visibles aux non-owners
-- (a brancher dans propertiesService.listProperties via .eq('moderation_status','approved'))
