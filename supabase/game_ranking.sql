-- 게임 랭킹 — Supabase 대시보드 > SQL Editor에 붙여넣고 한 번 실행하세요
-- 테이블은 직접 읽고 쓸 수 없고(RLS), 아래 함수로만 포인트를 쌓고 순위를 조회한다

create table if not exists public.game_ranking (
  user_id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 12),
  total_points int not null default 0,
  week_start date not null,
  week_points int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.game_ranking enable row level security;

-- 이번 주 월요일 (한국 시간 기준)
create or replace function public.kst_week_start() returns date
language sql stable as $$
  select date_trunc('week', now() at time zone 'Asia/Seoul')::date
$$;

-- 게임 한 판 끝날 때 포인트 적립 (한 판 최대 1000P)
create or replace function public.add_game_points(p_points int, p_nickname text)
returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.kst_week_start();
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  p_points := greatest(0, least(p_points, 1000));
  insert into game_ranking (user_id, nickname, total_points, week_start, week_points)
  values (auth.uid(), left(coalesce(nullif(trim(p_nickname), ''), '익명'), 12), p_points, w, p_points)
  on conflict (user_id) do update set
    total_points = game_ranking.total_points + p_points,
    week_points = case when game_ranking.week_start = w then game_ranking.week_points + p_points else p_points end,
    week_start = w,
    updated_at = now();
end $$;

-- 닉네임 변경
create or replace function public.set_game_nickname(p_nickname text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if char_length(trim(p_nickname)) not between 1 and 12 then raise exception 'invalid nickname'; end if;
  insert into game_ranking (user_id, nickname, week_start) values (auth.uid(), trim(p_nickname), public.kst_week_start())
  on conflict (user_id) do update set nickname = trim(p_nickname), updated_at = now();
end $$;

-- 순위표: 상위 50명 + 내 순위 (p_weekly = true면 이번 주, false면 누적)
create or replace function public.game_leaderboard(p_weekly boolean)
returns table (rank bigint, user_id uuid, nickname text, points int)
language sql stable security definer set search_path = public as $$
  with s as (
    select g.user_id, g.nickname,
      case when not p_weekly then g.total_points
           when g.week_start = public.kst_week_start() then g.week_points
           else 0 end as points
    from game_ranking g
  ), r as (
    select rank() over (order by s.points desc) as rank, s.user_id, s.nickname, s.points
    from s where s.points > 0
  )
  select * from r where r.rank <= 50 or r.user_id = auth.uid()
  order by r.rank, r.nickname
$$;

revoke all on function public.add_game_points(int, text) from public, anon;
revoke all on function public.set_game_nickname(text) from public, anon;
revoke all on function public.game_leaderboard(boolean) from public, anon;
grant execute on function public.add_game_points(int, text) to authenticated;
grant execute on function public.set_game_nickname(text) to authenticated;
grant execute on function public.game_leaderboard(boolean) to authenticated;
