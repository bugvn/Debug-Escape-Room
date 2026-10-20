-- Run once in Supabase -> SQL Editor -> New query -> Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null,
  difficulty text not null default 'BEGINNER' check (difficulty in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  result text not null check (result in ('won','time','left')),
  solved_count int not null default 0,
  hints_used int not null default 0,
  time_total_sec int not null,
  time_left_sec int not null,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id bigint references public.game_sessions(id) on delete set null,
  puzzle text not null,
  code text not null check (char_length(code) <= 2000),
  is_correct boolean not null,
  mistake_tag text,
  created_at timestamptz not null default now()
);

-- Row Level Security: each user touches only own rows
alter table public.profiles      enable row level security;
alter table public.game_sessions enable row level security;
alter table public.submissions   enable row level security;

create policy "profiles read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

create policy "sessions read own"   on public.game_sessions for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.game_sessions for insert with check (auth.uid() = user_id);

create policy "subs read own"   on public.submissions for select using (auth.uid() = user_id);
create policy "subs insert own" on public.submissions for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup (name + difficulty come from signUp metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, player_name, difficulty)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'player_name',''),
                  nullif(new.raw_user_meta_data->>'full_name',''),
                  split_part(new.email,'@',1)), 20),
    case when new.raw_user_meta_data->>'difficulty' in ('BEGINNER','INTERMEDIATE','ADVANCED')
         then new.raw_user_meta_data->>'difficulty' else 'BEGINNER' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
