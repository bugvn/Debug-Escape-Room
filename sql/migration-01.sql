-- Run once in Supabase -> SQL Editor if your tables already exist.
-- (New projects: run sql/schema.sql instead.)

alter table public.profiles add column if not exists consented_at timestamptz;

alter table public.submissions
  add column if not exists kind text not null default 'submit' check (kind in ('run','submit'));

alter table public.game_sessions drop constraint if exists game_sessions_result_check;
alter table public.game_sessions
  add constraint game_sessions_result_check check (result in ('in_progress','won','time','left'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, player_name, difficulty, consented_at)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'player_name',''),
                  nullif(new.raw_user_meta_data->>'full_name',''),
                  split_part(new.email,'@',1)), 20),
    case when new.raw_user_meta_data->>'difficulty' in ('BEGINNER','INTERMEDIATE','ADVANCED')
         then new.raw_user_meta_data->>'difficulty' else 'BEGINNER' end,
    case when new.raw_user_meta_data->>'consented' = 'true' then now() else null end
  );
  return new;
end $$;

-- Run once in Supabase -> SQL Editor if your tables already exist.
-- RUN THIS BEFORE you publish the new game-room.html / js/score.js / dashboard.html:
-- the new code saves elapsed_sec and no longer writes time_total_sec / time_left_sec.
--
-- 1) The timer counts up, so keep one number: elapsed_sec.
-- 2) 'time' (time up) belonged to the old countdown design. No game can end that way.
-- 3) player_name must follow the sign-up rule (letters, numbers, underscore, max 20).

alter table public.game_sessions add column if not exists elapsed_sec int not null default 0;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'time_left_sec') then
    update public.game_sessions set elapsed_sec = greatest(0, time_total_sec - time_left_sec);
    alter table public.game_sessions drop column time_total_sec;
    alter table public.game_sessions drop column time_left_sec;
  end if;
end $$;

alter table public.game_sessions drop constraint if exists game_sessions_result_check;
update public.game_sessions set result = 'left' where result = 'time';
alter table public.game_sessions
  add constraint game_sessions_result_check check (result in ('in_progress','won','left'));

-- clean names already saved from Google sign-ups
update public.profiles
   set player_name = left(coalesce(nullif(regexp_replace(player_name, '[^A-Za-z0-9_]+', '_', 'g'), ''), 'player'), 20)
 where player_name !~ '^[A-Za-z0-9_]+$';

-- sign-up trigger: same cleaning for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, player_name, difficulty, consented_at)
  values (
    new.id,
    left(coalesce(nullif(regexp_replace(
                  coalesce(nullif(new.raw_user_meta_data->>'player_name',''),
                           nullif(new.raw_user_meta_data->>'full_name',''),
                           split_part(new.email,'@',1)),
                  '[^A-Za-z0-9_]+', '_', 'g'), ''), 'player'), 20),
    case when new.raw_user_meta_data->>'difficulty' in ('BEGINNER','INTERMEDIATE','ADVANCED')
         then new.raw_user_meta_data->>'difficulty' else 'BEGINNER' end,
    case when new.raw_user_meta_data->>'consented' = 'true' then now() else null end
  );
  return new;
end $$;