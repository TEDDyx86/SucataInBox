alter table public.clips
  add column if not exists source_platform text not null default 'kick',
  add column if not exists source_clip_id text,
  add column if not exists source_url text,
  add column if not exists source_thumbnail_url text,
  add column if not exists source_created_at timestamptz;

update public.clips
set source_clip_id = kick_clip_id,
    source_url = kick_url,
    source_created_at = kick_created_at
where source_platform = 'kick' and source_clip_id is null;

alter table public.clips
  add constraint clips_source_platform_check check (source_platform in ('kick', 'twitch'));

alter table public.clips
  alter column source_clip_id set not null,
  alter column source_url set not null,
  alter column kick_clip_id drop not null,
  alter column kick_url drop not null,
  alter column thumbnail_key drop not null,
  alter column playlist_key drop not null,
  alter column storage_prefix drop not null;

alter table public.clips
  add constraint clips_source_clip_unique unique (source_platform, source_clip_id);

create index if not exists clips_source_created_idx
  on public.clips (source_created_at desc nulls last, created_at desc)
  where status = 'published';
