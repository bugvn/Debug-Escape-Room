-- migration-03: admin (researcher / teacher) access for the Analytics page.
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Normal players still see only their own rows. An admin can read every player's profile, games and
-- submissions, so the research_sessions / research_attempts views (security_invoker) show the whole cohort.
-- Those views contain no names or emails: participant is a short anonymous id.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "sessions admin read" on public.game_sessions;
drop policy if exists "subs admin read"     on public.submissions;
create policy "profiles admin read" on public.profiles      for select using (public.is_admin());
create policy "sessions admin read" on public.game_sessions for select using (public.is_admin());
create policy "subs admin read"     on public.submissions   for select using (public.is_admin());

-- "profiles update own" would let a player set is_admin = true on themselves. Block that:
-- only a change made from the SQL Editor (no logged-in user) may touch is_admin.
create or replace function public.block_admin_self_grant() returns trigger
language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null then
    raise exception 'is_admin can only be changed from the SQL Editor';
  end if;
  return new;
end $$;
drop trigger if exists block_admin_self_grant on public.profiles;
create trigger block_admin_self_grant before update on public.profiles
  for each row execute function public.block_admin_self_grant();

-- Make yourself an admin (replace the email), run it in the SQL Editor:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');