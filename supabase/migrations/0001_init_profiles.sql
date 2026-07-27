-- Book My Ride — Phase 1 schema: profiles, auth trigger, admin allowlist, photo storage.
-- Safe to re-run (idempotent-ish guards where practical).

-- ---------- Enums ----------
do $$ begin
  create type public.gender as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('teacher', 'volunteer', 'none');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  email        text,
  avatar_url   text,                         -- Google avatar (fallback)
  photo_url    text,                         -- uploaded photo (required to transact)
  phone        text,                         -- required to transact
  gender       public.gender,
  role         public.user_role not null default 'none',
  is_complete  boolean generated always as (
                 phone is not null and length(btrim(phone)) > 0
                 and photo_url is not null and length(btrim(photo_url)) > 0
               ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row when a user signs up (pulls Google metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- admin allowlist ----------
create table if not exists public.app_admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

insert into public.app_admins (email) values ('tech@merakiads.in')
  on conflict (email) do nothing;

-- ---------- RLS ----------
alter table public.profiles  enable row level security;
alter table public.app_admins enable row level security;

-- Any authenticated user can read profiles (column-level masking for gender/phone
-- is handled later via a SECURITY DEFINER RPC on the rides feed).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- app_admins: readable by admins only; managed out-of-band / via migrations.
drop policy if exists "app_admins_select_admin" on public.app_admins;
create policy "app_admins_select_admin"
  on public.app_admins for select
  to authenticated
  using (public.is_admin());

-- ---------- Storage: profile photos ----------
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict (id) do nothing;

-- Public read of photos (URLs shown on ride cards).
drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'photos');

-- Users may write only inside their own folder: photos/<uid>/...
drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos_update_own" on storage.objects;
create policy "photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
