create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  puzzle_id text not null,
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard', 'insane')),
  accuracy double precision not null check (accuracy >= 0 and accuracy <= 100),
  target_listens integer not null check (target_listens >= 1),
  is_perfect boolean not null,
  created_at timestamptz not null default now(),
  constraint game_attempts_perfect_matches_accuracy
    check (is_perfect = (accuracy = 100))
);

create index game_attempts_player_puzzle_perfect_listens_idx
  on public.game_attempts (player_id, puzzle_id, target_listens)
  where is_perfect;

alter table public.game_attempts enable row level security;

revoke all on table public.game_attempts from anon;
grant select, insert on table public.game_attempts to authenticated;

create policy "Players can insert their own attempts"
  on public.game_attempts
  for insert
  to authenticated
  with check ((select auth.uid()) = player_id);

create policy "Players can read their own attempts"
  on public.game_attempts
  for select
  to authenticated
  using ((select auth.uid()) = player_id);
