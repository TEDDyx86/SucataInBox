create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'moderator' check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  kick_clip_id text not null unique,
  kick_url text not null,
  title text not null,
  channel_name text not null,
  duration_seconds integer not null check (duration_seconds between 1 and 180),
  view_count integer not null default 0 check (view_count >= 0),
  kick_created_at timestamptz,
  thumbnail_key text not null,
  playlist_key text not null,
  storage_prefix text not null,
  status text not null default 'processing' check (status in ('processing', 'published', 'failed')),
  submitted_by uuid references public.profiles (id) on delete set null,
  failure_reason text,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

create index if not exists clips_published_created_idx
  on public.clips (kick_created_at desc nulls last, created_at desc)
  where status = 'published';

create index if not exists clips_submitted_by_idx on public.clips (submitted_by);

create or replace function public.has_app_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = required_role
  );
$$;

alter table public.profiles enable row level security;
alter table public.clips enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_app_role('admin'));

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update to authenticated
  using (public.has_app_role('admin'))
  with check (public.has_app_role('admin'));

drop policy if exists "clips_public_read_published" on public.clips;
create policy "clips_public_read_published"
  on public.clips for select to anon, authenticated
  using (status = 'published');

drop policy if exists "clips_staff_read_all" on public.clips;
create policy "clips_staff_read_all"
  on public.clips for select to authenticated
  using (public.has_app_role('admin') or public.has_app_role('moderator'));
