-- migration-04: run AFTER your own migration-03 (admin access). Safe to re-run.
-- 1) anti-cheat log table + view, 2) the missing grant that causes "permission denied for view research_sessions".
-- It needs public.is_admin() from your migration-03.

-- 2) anti-cheat log -----------------------------------------------------------
create table if not exists public.integrity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id bigint references public.game_sessions(id) on delete set null,
  event_type text not null check (event_type in
    ('paste','copy','cut','drop','contextmenu','tab_hidden','window_blur','devtools_key','big_jump','fullscreen_exit','auto_end')),
  puzzle_id text,                    -- puzzle window that was open (null = in the room)
  away_ms int,                       -- for tab_hidden / window_blur: how long the player was away
  strike boolean not null default false,   -- did this event count toward the strike limit?
  detail text check (char_length(detail) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists integrity_events_session_idx on public.integrity_events (session_id);
create index if not exists integrity_events_user_idx on public.integrity_events (user_id, created_at desc);

alter table public.integrity_events enable row level security;
drop policy if exists "integrity read own"     on public.integrity_events;
drop policy if exists "integrity admin read"   on public.integrity_events;
drop policy if exists "integrity insert own"   on public.integrity_events;
create policy "integrity read own"   on public.integrity_events for select using (auth.uid() = user_id);
create policy "integrity admin read" on public.integrity_events for select using (public.is_admin());
create policy "integrity insert own" on public.integrity_events for insert
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.game_sessions g where g.id = session_id and g.user_id = (select auth.uid())));

-- 3) views the analytics page reads -------------------------------------------
create or replace view public.research_integrity with (security_invoker = true) as
select
  left(md5(e.user_id::text), 8)                              as participant,
  case when p.adaptive then 'adaptive' else 'control' end    as study_group,
  rs.session_no, e.session_id,
  e.event_type, e.puzzle_id, e.away_ms, e.strike, e.created_at
from public.integrity_events e
join public.profiles p on p.id = e.user_id
left join public.research_sessions rs on rs.session_id = e.session_id;

-- the previous revoke is what caused "permission denied": undo it for logged-in users.
-- anon (not logged in) stays blocked. Row Level Security still limits which rows come back.
grant select on public.research_sessions, public.research_attempts, public.research_integrity to authenticated;
revoke all on public.research_sessions, public.research_attempts, public.research_integrity from anon;