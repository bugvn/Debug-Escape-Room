-- Run once in Supabase -> SQL Editor if your tables already exist.
-- (New projects: run schema.sql instead.)

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