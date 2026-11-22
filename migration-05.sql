-- migration-05: limit researcher exports to participants who accepted data recording.
-- Run after migration-03.sql and migration-04.sql.

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

create or replace view public.research_integrity with (security_invoker = true) as
select
  left(md5(e.user_id::text), 8)                              as participant,
  case when p.adaptive then 'adaptive' else 'control' end    as study_group,
  rs.session_no, e.session_id,
  e.event_type, e.puzzle_id, e.away_ms, e.strike, e.created_at
from public.integrity_events e
join public.profiles p on p.id = e.user_id
left join public.research_sessions rs on rs.session_id = e.session_id
where p.consented_at is not null;

grant select on public.research_sessions, public.research_attempts, public.research_integrity to authenticated;
revoke all on public.research_sessions, public.research_attempts, public.research_integrity from anon;
