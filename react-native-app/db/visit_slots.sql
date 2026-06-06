-- ORIZON - migration: visit_slots sur properties
-- Permet au proprietaire de definir les creneaux ou il est disponible pour
-- recevoir les visiteurs. Stocke comme jsonb (tableau de strings ISO 8601).
-- Exemple: [{ "date": "2026-06-15", "start": "10:00", "end": "12:00" }, ...]
-- A executer dans le SQL Editor de Supabase.

alter table public.properties
  add column if not exists visit_slots jsonb default '[]'::jsonb;

comment on column public.properties.visit_slots is
  'Creneaux de visite proposes par le proprietaire (tableau de { date, start, end }).';
