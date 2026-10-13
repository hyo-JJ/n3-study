-- 마이페이지 '전체 기록 초기화' 때 내 게임 기록도 지우기 — Supabase 대시보드 > SQL Editor에 붙여넣고 한 번 실행하세요
-- (game_best_ranking.sql을 먼저 실행해 둔 상태여야 함 — 닉네임(game_ranking)은 남김)

create or replace function public.reset_my_game_scores()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  delete from game_best where user_id = auth.uid();
end $$;

revoke all on function public.reset_my_game_scores() from public, anon;
grant execute on function public.reset_my_game_scores() to authenticated;
