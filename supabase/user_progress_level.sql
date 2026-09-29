-- 진행 상황을 레벨(N3·N4·N5)별 행으로 저장하도록 테이블 변경
-- Supabase 대시보드 > SQL Editor에 붙여넣고 한 번 실행하세요
-- (이전 테이블은 사용자당 1행이라 앱의 저장이 모두 실패하고 기기에만 남아 있었음)

-- 1) level 컬럼 추가 — 기존 행은 예전 앱(N3 전용)의 기록이므로 N3로 채움
alter table public.user_progress add column if not exists level text not null default 'N3';

-- 2) "사용자당 1행" 제약(user_id 단독 unique/primary key) 제거
do $$
declare c record;
begin
  for c in
    select con.conname, con.contype
    from pg_constraint con
    where con.conrelid = 'public.user_progress'::regclass
      and con.contype in ('u', 'p')
      and con.conkey = array[(select attnum from pg_attribute
                              where attrelid = 'public.user_progress'::regclass and attname = 'user_id')]::int2[]
  loop
    execute format('alter table public.user_progress drop constraint %I', c.conname);
  end loop;
end $$;
drop index if exists public.user_progress_user_id_key;

-- 3) 사용자 + 레벨 조합이 한 행 (앱의 upsert onConflict: 'user_id,level')
create unique index if not exists user_progress_user_level_key on public.user_progress (user_id, level);

-- 4) 본인 행만 읽고 쓰기 (이미 같은 정책이 있으면 그대로 둠)
alter table public.user_progress enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_progress' and policyname = 'own progress') then
    create policy "own progress" on public.user_progress
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
