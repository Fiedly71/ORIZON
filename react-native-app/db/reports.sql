-- ORIZON - signalement de contenus suspects.
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid references auth.users(id) on delete set null,
  target_type  text not null,        -- 'property' | 'review' | 'user'
  target_id    text not null,
  reason       text not null,        -- 'fake' | 'fraud' | 'spam' | 'inappropriate' | 'other'
  details      text default '',
  status       text not null default 'open', -- open | in_review | resolved | dismissed
  resolution   text,
  reviewer_id  uuid references auth.users(id),
  created_at   timestamptz default now(),
  resolved_at  timestamptz
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_target_idx on public.reports(target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "reports_self_read" on public.reports;
create policy "reports_self_read"
  on public.reports for select
  using (reporter_id = auth.uid());

drop policy if exists "reports_self_insert" on public.reports;
create policy "reports_self_insert"
  on public.reports for insert
  with check (reporter_id = auth.uid());
