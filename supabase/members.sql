-- 등록된 학생 명단으로만 회원가입 + 관리자 화면 — Supabase 대시보드 > SQL Editor에 붙여넣고 한 번 실행하세요
-- (user_progress_level.sql을 먼저 실행해 둔 상태여야 함)
--
-- members  : 가입할 수 있는 이름과 레벨 (관리자는 level 없음)
-- profiles : 가입한 계정의 이름·레벨·역할 — 회원가입 때 자동으로 만들어지고 본인은 읽기만 가능
-- 명단에 없는 이름이거나 이미 가입한 이름이면 회원가입 자체가 실패한다.

-- 0) 지금까지 가입된 계정과 학습 기록 모두 삭제 (게임 기록은 auth.users 삭제 시 함께 지워짐)
delete from public.user_progress;
delete from auth.users;

-- 1) 가입 가능한 명단
create table if not exists public.members (
  name text primary key,
  level text check (level in ('N1', 'N2', 'N3', 'N4', 'N5')),
  role text not null default 'student' check (role in ('student', 'admin'))
);
alter table public.members enable row level security;

insert into public.members (name, level, role) values
  ('김정훈', 'N3', 'student'), ('민건우', 'N3', 'student'), ('서정환', 'N3', 'student'), ('문수혁', 'N3', 'student'),
  ('이현준', 'N3', 'student'), ('김효정', 'N3', 'student'), ('정지윤', 'N3', 'student'), ('성윤수', 'N3', 'student'),
  ('이예빈', 'N2', 'student'),
  ('진수현', 'N1', 'student'), ('고승연', 'N1', 'student'),
  ('백선미', null, 'admin')
on conflict (name) do update set level = excluded.level, role = excluded.role;

-- 2) 가입한 계정 정보
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null unique references public.members (name) on delete cascade,
  level text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);

-- 3) 회원가입 화면에서 이름 확인 — ok(가입 가능, 레벨 안내) / not_member / taken
create or replace function public.check_signup_name(p_name text)
returns json
language sql stable security definer set search_path = public as $$
  select case
    when m.name is null then json_build_object('status', 'not_member')
    when exists (select 1 from public.profiles p where p.name = m.name) then json_build_object('status', 'taken')
    else json_build_object('status', 'ok', 'level', m.level, 'role', m.role)
  end
  from (select 1) x left join public.members m on m.name = replace(coalesce(p_name, ''), ' ', '');
$$;
grant execute on function public.check_signup_name(text) to anon, authenticated;

-- 4) 회원가입 시 명단 확인 후 profiles 생성 — 실패하면 가입이 취소됨
create or replace function public.handle_new_member()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n text := replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', '');
  m public.members;
begin
  select * into m from public.members where name = n;
  if not found then raise exception 'not_member'; end if;
  if exists (select 1 from public.profiles where name = n) then raise exception 'name_taken'; end if;
  insert into public.profiles (user_id, name, level, role) values (new.id, n, m.level, m.role);
  return new;
end $$;
drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member after insert on auth.users
  for each row execute function public.handle_new_member();

-- 5) 관리자 화면 — 명단 전체 + 가입 여부 + 레벨별 진도·정답률(flash_progress._stats)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.admin_overview()
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    select coalesce(json_agg(r order by r.ord, r.name), '[]'::json) from (
      select m.name, m.level, p.user_id is not null as joined, p.created_at,
        array_position(array['N1', 'N2', 'N3', 'N4', 'N5'], m.level) as ord,
        (select coalesce(json_agg(json_build_object(
            'level', u.level, 'passed_days', u.passed_days,
            'stats', u.flash_progress -> '_stats', 'updated_at', u.updated_at)), '[]'::json)
          from public.user_progress u where u.user_id = p.user_id) as progress
      from public.members m left join public.profiles p on p.name = m.name
      where m.role = 'student'
    ) r
  );
end $$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
