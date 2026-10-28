-- 꼬마 탐험가의 유적 · 친구 순위표
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run 을 누르세요.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  nickname    text        not null check (char_length(btrim(nickname)) between 1 and 12),
  level       smallint    not null check (level between 0 and 19),
  steps       integer     not null check (steps between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index if not exists scores_level_steps_idx on public.scores (level, steps);

-- 누구나 읽고 기록을 추가할 수 있지만, 고치거나 지울 수는 없습니다.
alter table public.scores enable row level security;

drop policy if exists "scores are readable by everyone" on public.scores;
create policy "scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score"
  on public.scores for insert
  to anon, authenticated
  with check (true);

-- 스테이지별로 닉네임마다 가장 적은 걸음 수 하나만 보여 주는 순위표
create or replace view public.leaderboard
  with (security_invoker = true) as
  select level, nickname, min(steps) as best, min(created_at) as first_at
  from public.scores
  group by level, nickname;

grant select on public.leaderboard to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
