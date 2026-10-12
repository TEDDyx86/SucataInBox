create table if not exists public.clip_submissions (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null check (source_platform in ('kick', 'twitch')),
  source_clip_id text not null,
  source_url text not null,
  display_name text,
  display_name_consent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'failed')),
  failure_reason text,
  cleanup_error boolean not null default false,
  processing_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clip_submissions_display_name_length check (
    display_name is null or (length(display_name) between 1 and 40 and display_name = btrim(display_name))
  ),
  constraint clip_submissions_display_name_consent check (
    display_name is null or display_name_consent_at is not null
  ),
  constraint clip_submissions_source_unique unique (source_platform, source_clip_id)
);

create index if not exists clip_submissions_queue_idx
  on public.clip_submissions (status, created_at asc);

alter table public.clips
  add column if not exists community_submitter_name text,
  add column if not exists community_name_consent_at timestamptz,
  add column if not exists community_submission_id uuid,
  add column if not exists community_import_started_at timestamptz;

alter table public.clips
  add constraint clips_community_submission_fk
  foreign key (community_submission_id)
  references public.clip_submissions (id)
  on delete restrict;

alter table public.clips
  add constraint clips_community_name_consent check (
    community_submitter_name is null or community_name_consent_at is not null
  );

create index if not exists clips_community_submission_idx
  on public.clips (community_submission_id)
  where community_submission_id is not null;

create table if not exists public.clip_submission_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempt_timestamps timestamptz[] not null default '{}',
  expires_at timestamptz not null
);

create index if not exists clip_submission_rate_limits_expiry_idx
  on public.clip_submission_rate_limits (expires_at);

alter table public.clip_submissions enable row level security;
alter table public.clip_submission_rate_limits enable row level security;

revoke all on table public.clip_submissions from public, anon, authenticated;
revoke all on table public.clip_submission_rate_limits from public, anon, authenticated;
grant all on table public.clip_submissions to service_role;
grant all on table public.clip_submission_rate_limits to service_role;

create or replace function public.submit_community_clip(
  p_platform text,
  p_clip_id text,
  p_source_url text,
  p_display_name text,
  p_consent boolean,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_attempts timestamptz[];
  v_submission_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not authorized';
  end if;

  if p_platform not in ('kick', 'twitch')
    or p_clip_id is null
    or length(p_clip_id) not between 5 and 100
    or p_source_url is null
    or length(p_source_url) > 2048
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or (p_display_name is not null and (length(p_display_name) not between 1 and 40 or p_display_name <> btrim(p_display_name)))
    or (p_display_name is not null and p_consent is not true)
  then
    return jsonb_build_object('kind', 'invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));

  delete from public.clip_submission_rate_limits
  where expires_at <= v_now;

  select coalesce(
    array_agg(attempt_at order by attempt_at),
    array[]::timestamptz[]
  )
  into v_attempts
  from public.clip_submission_rate_limits as limits,
       unnest(limits.attempt_timestamps) as attempt_at
  where limits.ip_hash = p_ip_hash
    and attempt_at > v_now - interval '1 hour';

  if cardinality(v_attempts) >= 5 then
    return jsonb_build_object('kind', 'rate_limited');
  end if;

  v_attempts := array_append(v_attempts, v_now);
  insert into public.clip_submission_rate_limits (ip_hash, attempt_timestamps, expires_at)
  values (p_ip_hash, v_attempts, v_now + interval '1 hour')
  on conflict (ip_hash) do update
    set attempt_timestamps = excluded.attempt_timestamps,
        expires_at = excluded.expires_at;

  if exists (
    select 1
    from public.clip_submissions
    where source_platform = p_platform and source_clip_id = p_clip_id
  ) or exists (
    select 1
    from public.clips
    where source_platform = p_platform and source_clip_id = p_clip_id
  ) then
    return jsonb_build_object('kind', 'duplicate');
  end if;

  insert into public.clip_submissions (
    source_platform,
    source_clip_id,
    source_url,
    display_name,
    display_name_consent_at
  ) values (
    p_platform,
    p_clip_id,
    p_source_url,
    p_display_name,
    case when p_display_name is not null then v_now else null end
  )
  returning id into v_submission_id;

  return jsonb_build_object('kind', 'created', 'id', v_submission_id);
exception
  when unique_violation then
    return jsonb_build_object('kind', 'duplicate');
end;
$$;

revoke all on function public.submit_community_clip(text, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_community_clip(text, text, text, text, boolean, text) to service_role;

create or replace function public.finalize_community_clip_import(
  p_submission_id uuid,
  p_clip_id uuid,
  p_processing_started_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.clip_submissions%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not authorized';
  end if;

  select * into v_submission
  from public.clip_submissions
  where id = p_submission_id
    and status = 'processing'
    and processing_started_at = p_processing_started_at
  for update;

  if not found then
    return false;
  end if;

  update public.clips
  set status = 'published',
      community_submitter_name = case
        when v_submission.display_name_consent_at is not null then v_submission.display_name
        else null
      end,
      community_name_consent_at = v_submission.display_name_consent_at,
      community_submission_id = null,
      community_import_started_at = null,
      imported_at = now(),
      failure_reason = null
  where id = p_clip_id
    and source_platform = v_submission.source_platform
    and source_clip_id = v_submission.source_clip_id
    and community_submission_id = p_submission_id
    and community_import_started_at = p_processing_started_at
    and status = 'processing';

  if not found then
    return false;
  end if;

  delete from public.clip_submissions where id = p_submission_id;
  return true;
end;
$$;

revoke all on function public.finalize_community_clip_import(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_community_clip_import(uuid, uuid, timestamptz) to service_role;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'expire-clip-submission-rate-limits';

select cron.schedule(
  'expire-clip-submission-rate-limits',
  '* * * * *',
  $job$delete from public.clip_submission_rate_limits where expires_at <= now();$job$
);
