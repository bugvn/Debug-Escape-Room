-- Run once in Supabase -> SQL Editor -> New query -> Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null,
  difficulty text not null default 'BEGINNER' check (difficulty in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  consented_at timestamptz,
  adaptive boolean not null default true,   -- true = adaptive game, false = fixed-level control group
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  result text not null check (result in ('in_progress','won','left')),
  solved_count int not null default 0,
  hints_used int not null default 0,
  elapsed_sec int not null default 0,
  level text check (level in ('BEGINNER','INTERMEDIATE','ADVANCED')),        -- level of this room
  next_level text check (next_level in ('BEGINNER','INTERMEDIATE','ADVANCED')), -- level the rules chose for the next room
  puzzle_ids text[],                                                          -- the 4 puzzles in this room
  created_at timestamptz not null default now()
);

create table public.submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id bigint references public.game_sessions(id) on delete set null,
  puzzle text not null,
  code text not null check (char_length(code) <= 2000),
  kind text not null default 'submit' check (kind in ('run','submit')),
  is_correct boolean not null,
  mistake_tag text,
  puzzle_id text,
  category text,            -- what the puzzle trains
  difficulty text,
  attempt_no int,           -- 1 = first attempt at this puzzle in this game
  hints_used int,           -- hints taken on this puzzle so far
  elapsed_ms int,           -- time spent inside this puzzle so far
  mistake_category text,    -- what the player's wrong code did (from the error name)
  created_at timestamptz not null default now()
);

-- Row Level Security: each user touches only own rows
alter table public.profiles      enable row level security;
alter table public.game_sessions enable row level security;
alter table public.submissions   enable row level security;

create policy "profiles read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

create policy "sessions read own"   on public.game_sessions for select using (auth.uid() = user_id);
create policy "sessions update own" on public.game_sessions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sessions insert own" on public.game_sessions for insert with check (auth.uid() = user_id);

create policy "subs read own"   on public.submissions for select using (auth.uid() = user_id);
create policy "subs insert own" on public.submissions for insert
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.game_sessions g where g.id = session_id and g.user_id = (select auth.uid())));

create index game_sessions_user_created_idx on public.game_sessions (user_id, created_at desc);
create index submissions_session_idx on public.submissions (session_id);
create index submissions_user_created_idx on public.submissions (user_id, created_at desc);

-- Auto-create profile on signup (name + difficulty come from signUp metadata)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Researcher export. No names or emails: participant is a short anonymous id.
--    Run in the SQL Editor (as postgres, so it sees every player), then use "Download CSV".
--      select * from research_attempts order by participant, session_no, created_at;
--      select * from research_sessions order by participant, session_no;
create or replace view public.research_sessions with (security_invoker = true) as
select
  left(md5(g.user_id::text), 8)                                   as participant,
  case when p.adaptive then 'adaptive' else 'control' end         as study_group,
  p.difficulty                                                    as start_level,
  row_number() over (partition by g.user_id order by g.created_at, g.id) as session_no,
  g.id                                                            as session_id,
  g.created_at,
  g.level, g.next_level, g.result, g.solved_count, g.hints_used, g.elapsed_sec, g.puzzle_ids,
  count(s.*) filter (where s.kind = 'submit')                     as submits,
  count(s.*) filter (where s.kind = 'submit' and s.is_correct)    as submits_correct,
  round(100.0 * count(s.*) filter (where s.kind = 'submit' and s.is_correct)
        / nullif(count(s.*) filter (where s.kind = 'submit'), 0), 1) as submit_accuracy_pct,
  count(distinct s.puzzle_id) filter (where s.attempt_no = 1 and s.is_correct) as first_attempt_correct
from public.game_sessions g
join public.profiles p on p.id = g.user_id
left join public.submissions s on s.session_id = g.id
where p.consented_at is not null
group by g.id, p.adaptive, p.difficulty;

create or replace view public.research_attempts with (security_invoker = true) as
select
  left(md5(s.user_id::text), 8)                                   as participant,
  case when p.adaptive then 'adaptive' else 'control' end         as study_group,
  rs.session_no, s.session_id, rs.level                           as room_level,
  s.puzzle_id, s.category, s.difficulty, s.kind, s.attempt_no,
  s.is_correct, s.mistake_tag, s.mistake_category,
  s.hints_used, s.elapsed_ms, s.code, s.created_at
from public.submissions s
join public.profiles p on p.id = s.user_id
left join public.research_sessions rs on rs.session_id = s.session_id
where p.consented_at is not null;

revoke all on public.research_sessions, public.research_attempts from anon, authenticated;

-- After this file, also run migration-03.sql: it lets the analytics page read the views above
-- (admin flag + grants) and adds the anti-cheat log table.