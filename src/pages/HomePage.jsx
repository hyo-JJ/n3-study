import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { LEVELS } from '../lib/data'
import { GRAMMAR, nextExam } from '../lib/data/jlpt'
import { levelSummary, dayRoute, learnedWords } from '../lib/study'
import { LAST_BASIC } from './LevelPage'
import * as Ico from '../components/Icons'

const lastBasic = () => { try { return localStorage.getItem(LAST_BASIC) === 'N4' ? 'N4' : 'N5' } catch { return 'N5' } }

function Folder({ c, icon, meta, desc, name, isNew, onClick }) {
  return (
    <button className="nb-folder" style={{ '--c': c }} onClick={onClick}>
      <div className="nb-folder-in">
        {isNew && <span className="nb-new">NEW</span>}
        <div className="nb-folder-top">
          <span className="nb-ico">{icon}</span>
          <span className="nb-meta">{meta}</span>
        </div>
        <div className="nb-desc">{desc}</div>
        <div className="nb-name">{name}</div>
      </div>
    </button>
  )
}

export default function HomePage() {
  const user = useAuth()
  const { getLevel, my, syncing } = useProgress()
  const { toggle, isDark } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()

  const name = user?.user_metadata?.full_name || '학생'
  const h = new Date().getHours()
  const hello = h < 12 ? '좋은 아침이에요' : h < 18 ? '안녕하세요' : '오늘도 수고했어요'

  const levels = Object.keys(LEVELS)
  const sum = Object.fromEntries(levels.map(l => [l, levelSummary(l, getLevel(l))]))
  const wrong = levels.reduce((s, l) => s + getLevel(l).wrongWords.length, 0)
  const passedAll = levels.reduce((s, l) => s + sum[l].passed, 0)
  const learned = useMemo(() => learnedWords(getLevel).length, [getLevel])
  const { dday } = nextExam()
  const grammarCount = Object.values(GRAMMAR).reduce((s, a) => s + a.length, 0)

  // 이어하기: 오늘 할 N3 Day → 없으면 N4·N5
  const n3 = sum.N3
  const basic = lastBasic()
  const target = !n3.allDone && !n3.doneToday ? 'N3' : !sum[basic].allDone ? basic : null
  const status1 = n3.allDone ? 'N3 완주! 🎉'
    : n3.doneToday ? '오늘 N3 학습 완료 ✓'
    : `오늘의 N3 · Day ${n3.next}`
  const status2 = `완료 ${passedAll} Day · 학습 단어 ${learned} · 오답 ${wrong}`

  const go = () => {
    if (!target) { toast('모든 Day를 끝냈어요! 복습·게임으로 가볼까요? 🎉'); return }
    if (target !== 'N3') toast(`N3는 내일! 지금은 ${target} Day ${sum[target].next} 이어하기 💪`)
    navigate(dayRoute(target, getLevel(target), sum[target].next))
  }

  const logout = async () => { if (confirm('로그아웃 하시겠어요?')) await supabase.auth.signOut() }

  return (
    <div className="screen nb">
      <div className="nb-head">
        <button className="nb-ibtn" aria-label="테마 바꾸기" onClick={toggle}>{isDark ? <Ico.Sun /> : <Ico.Moon />}</button>
        <span className="sp" />
        <span className={`nb-dot${syncing ? ' busy' : ''}`} title={syncing ? '저장 중' : '저장됨'} />
        <button className="nb-ibtn" aria-label="단어장" onClick={() => navigate('/mywords')}><Ico.Star /></button>
        <button className="nb-ibtn" aria-label="로그아웃" onClick={logout}><Ico.User /></button>
      </div>
      <div className="scroll">
        <h1 className="nb-hero">
          오늘도 한 단어씩.<br />차곡차곡 ことば.
          <small>{hello}, {name}님 👋</small>
        </h1>

        <div className="nb-status">
          <div className="nb-box">
            <span className="hash">#</span>
            <div className="nb-stats">
              <span className="l1">{status1}</span>
              <span className="l2">{status2}</span>
            </div>
          </div>
          <button className="nb-go" onClick={go} aria-label="이어서 학습하기"><Ico.Play />이어하기</button>
        </div>

        <h2 className="nb-sec">내 학습 공간</h2>
        <div className="nb-grid">
          <Folder c="var(--nb-gray)" icon={<Ico.Folder />} name="N3 본 공부"
            meta={<><b>Day {n3.passed}/{n3.total}</b><br />하루 1 Day</>}
            desc={n3.doneToday ? '오늘 몫 끝! 내일 또 만나요' : '단어 → 백지 복습 → 누적 테스트'}
            onClick={() => navigate('/study/N3')} />
          <Folder c="var(--nb-green)" icon={<Ico.Bolt />} name="N4·N5 단어"
            meta={<><b>N5 {sum.N5.passed}/{sum.N5.total}</b><br /><b>N4 {sum.N4.passed}/{sum.N4.total}</b></>}
            desc="제한 없이 기초를 쭉쭉"
            onClick={() => navigate(`/study/${basic}`)} />
          <Folder c="var(--nb-beige)" icon={<Ico.Book />} name="복습 공간"
            meta={<><b>오답 {wrong}개</b><br />주말 복습</>}
            desc="틀린 단어와 이번 주 단어 다시 보기"
            onClick={() => navigate('/review')} />
          <Folder c="var(--nb-lime)" icon={<Ico.Cup />} name="JLPT 공부"
            meta={<><b>시험 D-{dday}</b><br />문법 {grammarCount}개</>}
            desc="시험 안내 · 문제 유형 · 문법 퀴즈"
            onClick={() => navigate('/jlpt')} />
          <Folder c="var(--nb-pink)" icon={<Ico.Plane />} name="단어 게임"
            meta={<><b>외운 단어 {learned}개</b><br />게임 3종</>}
            desc="스피드 퀴즈 · 짝 맞추기 · 요미카타"
            onClick={() => navigate('/game')} />
          <Folder c="var(--nb-purple)" icon={<Ico.Heart />} name="나만의 단어장" isNew
            meta={<><b>{my.words.length}단어</b><br />직접 추가</>}
            desc="나만 쓰는 단어장, 따로 모아 외우기"
            onClick={() => navigate('/mywords')} />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
