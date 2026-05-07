-- phone_verify.sql - Colonnes profil pour verification telephone
alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists phone_verified_at timestamptz;
create index if not exists profiles_phone_verified_idx on public.profiles(phone_verified) where phone_verified;
