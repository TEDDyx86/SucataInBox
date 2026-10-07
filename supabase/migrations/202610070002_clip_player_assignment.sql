alter table public.clips
  add column if not exists player_id text;

update public.clips
set player_id = case
  when kick_url ~* '^https://(www\.)?kick\.com/aninha-gameplay-trynda/clips/' then 'aninha-gameplay'
  when kick_url ~* '^https://(www\.)?kick\.com/vinnycaffe/clips/' then 'yasuocadeirante'
  when kick_url ~* '^https://(www\.)?kick\.com/rammustaunt/clips/' then 'rammus'
  when kick_url ~* '^https://(www\.)?kick\.com/glub-lol/clips/' then 'youGlubGlub'
  when kick_url ~* '^https://(www\.)?kick\.com/lyer01/clips/' then 'lyer'
  when kick_url ~* '^https://(www\.)?kick\.com/gabikoersen/clips/' then 'gabis-koersen'
  when kick_url ~* '^https://(www\.)?kick\.com/coelhapistoleira/clips/' then 'coelha-pistoleira'
  else player_id
end
where player_id is null;

create index if not exists clips_player_created_idx
  on public.clips (player_id, kick_created_at desc nulls last, created_at desc)
  where status = 'published';
