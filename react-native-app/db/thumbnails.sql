-- Patch 17 - Ajout colonne thumbs (versions low-res des photos pour listes)
alter table public.properties add column if not exists thumbs jsonb default '[]'::jsonb;

-- Index pour pagination performante
create index if not exists ix_properties_posted_at on public.properties(posted_at desc);
create index if not exists ix_properties_payment_status on public.properties(payment_status);
