-- migration-06: remember each player's level + whether they have seen the lesson module.
-- Run once in Supabase -> SQL Editor. Safe to re-run.
--
-- current_level      the level the player is at right now. The game room starts here, so a player who
--                    reached Intermediate stays on Intermediate instead of falling back to the level they
--                    picked when they signed up (profiles.difficulty, kept as the "start level" for research).
-- lesson_seen_level  highest level whose lesson module the player finished. NULL = never saw the lessons.

alter table public.profiles add column if not exists current_level text
  check (current_level in ('BEGINNER','INTERMEDIATE','ADVANCED'));
alter table public.profiles add column if not exists lesson_seen_level text
  check (lesson_seen_level in ('BEGINNER','INTERMEDIATE','ADVANCED'));

-- 1) existing accounts: current level = what their latest finished game chose, else their sign-up level
update public.profiles p
   set current_level = coalesce(
         (select g.next_level from public.game_sessions g
           where g.user_id = p.id and g.next_level is not null
           order by g.created_at desc, g.id desc limit 1),
         p.difficulty)
 where p.current_level is null;

-- 2) existing accounts that already played do NOT have to take the lecture (it stays open for review)
update public.profiles p
   set lesson_seen_level = p.current_level
 where p.lesson_seen_level is null
   and exists (select 1 from public.game_sessions g where g.user_id = p.id);

-- 3) every finished game writes next_level; copy it to the profile in the same step, so the level can never
--    be lost by a closed tab, a failed second request, or only looking at the last few games
create or replace function public.sync_current_level() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.next_level is not null then
    update public.profiles set current_level = new.next_level where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists game_sessions_sync_level on public.game_sessions;
create trigger game_sessions_sync_level
  after insert or update of next_level on public.game_sessions
  for each row execute function public.sync_current_level();

-- 4) new sign-ups start at the level they picked (current_level = difficulty)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare lvl text := case when new.raw_user_meta_data->>'difficulty' in ('BEGINNER','INTERMEDIATE','ADVANCED')
                         then new.raw_user_meta_data->>'difficulty' else 'BEGINNER' end;
begin
  insert into public.profiles (id, player_name, difficulty, current_level, consented_at)
  values (
    new.id,
    left(coalesce(nullif(regexp_replace(
                  coalesce(nullif(new.raw_user_meta_data->>'player_name',''),
                           nullif(new.raw_user_meta_data->>'full_name',''),
                           split_part(new.email,'@',1)),
                  '[^A-Za-z0-9_]+', '_', 'g'), ''), 'player'), 20),
    lvl, lvl,
    case when new.raw_user_meta_data->>'consented' = 'true' then now() else null end
  );
  return new;
end $$;
