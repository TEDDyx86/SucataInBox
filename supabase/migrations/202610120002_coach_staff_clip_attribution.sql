alter table public.clips
  add column if not exists coach_staff_id text;

create index if not exists clips_coach_staff_created_idx
  on public.clips (coach_staff_id, created_at desc)
  where coach_staff_id is not null;
