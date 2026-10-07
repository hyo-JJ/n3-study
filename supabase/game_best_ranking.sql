-- 게임별 랭킹 — Supabase 대시보드 > SQL Editor에 붙여넣고 한 번 실행하세요
-- (game_ranking.sql을 먼저 실행해 둔 상태여야 함 — 닉네임은 game_ranking 테이블 것을 그대로 씀)
--
-- 게임마다 최고 기록으로 순위를 매긴다. 이번 주 기록과 전체 기록을 따로 둔다.
--   speed   스피드 퀴즈  맞힌 개수 (클수록 좋음)
--   match   짝 맞추기    걸린 초   (작을수록 좋음)
--   reading 요미카타     점수 0~100 (클수록 좋음)
-- 테이블은 직접 읽고 쓸 수 없고(RLS), 아래 함수로만 기록을 올리고 순위를 조회한다.

create table if not exists public.game_best (
  user_id uuid not null references auth.users on delete cascade,
  game text not null check (game in ('speed', 'match', 'reading')),
  period date not null,      -- 그 주 월요일(한국 시간), 전체 기록은 2000-01-01
  best int not null,
  achieved_at timestamptz not null default now(),
  primary key (user_id, game, period)
);
alter table public.game_best enable row level security;

-- 게임 한 판 끝날 때 기록 올리기 — 이번 주·전체 기록보다 좋을 때만 바뀜
create or replace function public.submit_game_score(p_game text, p_value int, p_nickname text)
returns void
language plpgsql security definer set search_path = public as $$
declare low boolean := p_game = 'match';
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if p_game not in ('speed', 'match', 'reading') then raise exception 'invalid game'; end if;
  p_value := case p_game
    when 'speed' then greatest(0, least(p_value, 300))
    when 'reading' then greatest(0, least(p_value, 100))
    else greatest(3, least(p_value, 3600)) end;
  if not low and p_value = 0 then return; end if;

  -- 랭킹에 처음 오른 사람은 기본 닉네임으로 등록
  insert into game_ranking (user_id, nickname, week_start)
  values (auth.uid(), left(coalesce(nullif(trim(p_nickname), ''), '익명'), 12), public.kst_week_start())
  on conflict (user_id) do nothing;

  insert into game_best as b (user_id, game, period, best)
  values (auth.uid(), p_game, public.kst_week_start(), p_value), (auth.uid(), p_game, date '2000-01-01', p_value)
  on conflict (user_id, game, period) do update set best = excluded.best, achieved_at = now()
  where (low and excluded.best < b.best) or (not low and excluded.best > b.best);
end $$;

-- 순위표: 상위 50명 + 내 순위 (같은 기록이면 같은 등수, 먼저 세운 사람이 위)
create or replace function public.game_best_leaderboard(p_game text, p_weekly boolean)
returns table (rank bigint, user_id uuid, nickname text, best int)
language sql stable security definer set search_path = public as $$
  with r as (
    select rank() over (order by case when p_game = 'match' then b.best else -b.best end) as rank,
      b.user_id, coalesce(g.nickname, '익명') as nickname, b.best, b.achieved_at
    from game_best b left join game_ranking g on g.user_id = b.user_id
    where b.game = p_game
      and b.period = case when p_weekly then public.kst_week_start() else date '2000-01-01' end
  )
  select r.rank, r.user_id, r.nickname, r.best from r
  where r.rank <= 50 or r.user_id = auth.uid()
  order by r.rank, r.achieved_at
$$;

revoke all on function public.submit_game_score(text, int, text) from public, anon;
revoke all on function public.game_best_leaderboard(text, boolean) from public, anon;
grant execute on function public.submit_game_score(text, int, text) to authenticated;
grant execute on function public.game_best_leaderboard(text, boolean) to authenticated;
