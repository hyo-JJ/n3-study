import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useProgress, today } from '../hooks/useProgress'
import { useStudyStyle } from '../hooks/useStudyStyle'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { LEVELS } from '../lib/data'
import { GRAMMAR } from '../lib/data/jlpt'
import { learnedWords } from '../lib/study'
import { KANJI_LV, KANJI_SETS } from '../lib/kanji'
import { PACE, COGNITIVE, styleName } from '../lib/studyStyle'

const EMPTY = () => ({ passedDays: [], flashProgress: {}, blankProgress: {}, wrongWords: [], passedAt: {} })
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d) }
const KIND = { test: '누적 테스트', kanji: '한자 테스트', grammar: '문법 퀴즈' }

// 연속 학습일 — 오늘(아직 안 했으면 어제)부터 거꾸로
function streakOf(log) {
  let n = 0
  let i = log[today()] ? 0 : 1
  while (log[daysAgo(i)]) { n++; i++ }
  return n
}

function Bar({ label, value, max, c }) {
  return (
    <div className="my-bar">
      <div className="my-bar-top"><span>{label}</span><b>{value} / {max}</b></div>
      <div className="nb-bar"><i style={{ width: `${max ? value / max * 100 : 0}%`, '--c': c }} /></div>
    </div>
  )
}

// 마이페이지 — 내 학습 프로필, 얼마나 잘하고 있는지, 기록 초기화, 로그아웃
export default function MyPage() {
  const user = useAuth()
  const { getLevel, update, my, updateMy } = useProgress()
  const { style } = useStudyStyle()
  const navigate = useNavigate()
  const toast = useToast()

  const name = user?.user_metadata?.full_name || '학생'
  const levels = Object.keys(LEVELS)
  const log = my.log ?? {}
  const scores = my.scores ?? []
  const learned = useMemo(() => learnedWords(getLevel).length, [getLevel])
  const wrong = levels.reduce((s, l) => s + getLevel(l).wrongWords.length, 0)
  const kanji = getLevel(KANJI_LV)
  const grammarAll = Object.values(GRAMMAR).reduce((s, a) => s + a.length, 0)
  const grammarDone = Object.keys(my.grammarDone ?? {}).length

  const week = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
  const weekCount = week.filter(d => log[d]).length
  const streak = streakOf(log)
  const recent = scores.slice(-10)
  const avg = recent.length ? Math.round(recent.reduce((s, x) => s + x.correct / x.total, 0) / recent.length * 100) : null
  const prev = scores.slice(-20, -10)
  const prevAvg = prev.length ? Math.round(prev.reduce((s, x) => s + x.correct / x.total, 0) / prev.length * 100) : null
  const trend = avg != null && prevAvg != null ? avg - prevAvg : null

  const comment = streak >= 7 ? '일주일 넘게 매일 공부하고 있어요. 대단해요! 🔥'
    : weekCount >= 4 ? '이번 주 꾸준히 하고 있어요. 이대로만 가요 💪'
    : weekCount > 0 ? '조금씩 하고 있어요. 하루 한 세트만 더 해볼까요?'
    : '이번 주는 아직 기록이 없어요. 오늘 한 세트부터 시작해요 🌱'

  // 기록 초기화 — 되돌릴 수 없으니 두 번 확인
  const reset = (what, label) => {
    if (!confirm(`${label}을(를) 초기화할까요?\n지운 기록은 되돌릴 수 없어요.`)) return
    if (what === 'all' && !confirm('정말 모든 학습 기록을 지울까요?\n(학습 프로필·게임 기록·랭킹은 그대로예요)')) return
    if (what === 'wrong') [...levels, KANJI_LV].forEach(l => update(l, st => ({ ...st, wrongWords: [] })))
    else if (what === 'all') {
      [...levels, KANJI_LV].forEach(l => update(l, EMPTY()))
      updateMy(m => ({ ...m, log: {}, scores: [], grammarDone: {}, grammarWrong: {} }))
    } else update(what, EMPTY())
    toast(`${label} 초기화했어요`)
  }

  const logout = async () => { if (confirm('로그아웃 하시겠어요?')) await supabase.auth.signOut() }

  return (
    <div className="screen nb">
      <NbHeader title="마이페이지" />
      <div className="scroll">
        <div className="nb-card my-me">
          <div className="grow">
            <div className="my-name">{name}님</div>
            <div className="nb-p" style={{ fontSize: 12.5 }}>{user?.email}</div>
          </div>
          <button className="nb-btn ghost sm" onClick={() => navigate('/style')}>학습 프로필</button>
        </div>
        <button className="nb-card nb-row" onClick={() => navigate('/style')}>
          <span className="grow">
            <div className="t">{PACE[style.pace].emoji}{COGNITIVE[style.cognitive].emoji} {styleName(style)}</div>
            <div className="s">{PACE[style.pace].short} · {COGNITIVE[style.cognitive].short} — 눌러서 프로필 보기·다시 찾기</div>
          </span>
        </button>

        <h2 className="nb-h">얼마나 잘하고 있나요?</h2>
        <div className="nb-card">
          <p className="nb-p" style={{ marginBottom: 12 }}>{comment}</p>
          <div className="my-week">
            {week.map(d => (
              <div key={d} className={`my-day${log[d] ? ' on' : ''}${d === today() ? ' today' : ''}`}>
                <span>{'일월화수목금토'[new Date(`${d}T00:00`).getDay()]}</span>
              </div>
            ))}
          </div>
          <div className="stats" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="stat"><div className="stat-n">{streak}<small>일</small></div><div className="stat-l">연속 학습</div></div>
            <div className="stat"><div className="stat-n">{weekCount}<small>/7</small></div><div className="stat-l">이번 주</div></div>
            <div className="stat"><div className="stat-n">{Object.keys(log).length}<small>일</small></div><div className="stat-l">총 학습일</div></div>
          </div>
        </div>

        <div className="nb-card">
          <div className="my-score">
            <div>
              <div className="nb-p" style={{ fontSize: 12.5 }}>최근 테스트·퀴즈 평균</div>
              <div className="my-avg">{avg == null ? '—' : `${avg}점`}</div>
            </div>
            {trend != null && <span className="nb-chip" style={{ '--c': trend >= 0 ? 'var(--nb-green)' : 'var(--nb-pink)' }}>{trend >= 0 ? `▲ ${trend}` : `▼ ${-trend}`}점</span>}
          </div>
          {recent.length ? (
            <div className="my-recent">
              {[...recent].reverse().slice(0, 5).map((x, i) => (
                <div key={i} className="my-recent-row">
                  <span>{x.label || KIND[x.kind]}</span>
                  <b style={{ color: x.correct / x.total >= .7 ? 'var(--nb-ok)' : 'var(--nb-err)' }}>{Math.round(x.correct / x.total * 100)}점</b>
                </div>
              ))}
            </div>
          ) : <p className="nb-p" style={{ marginTop: 8 }}>테스트나 퀴즈를 풀면 여기에 점수가 쌓여요.</p>}
        </div>

        <div className="nb-card">
          {['N5', 'N4', 'N3'].map((l, i) => (
            <Bar key={l} label={`${l} 단어`} value={getLevel(l).passedDays.length} max={LEVELS[l].days.length} c={['var(--nb-green)', 'var(--nb-yellow)', 'var(--nb-purple)'][i]} />
          ))}
          <Bar label="상용한자 세트" value={kanji.passedDays.length} max={KANJI_SETS} c="var(--nb-lime)" />
          <Bar label="외운 문법" value={grammarDone} max={grammarAll} c="var(--nb-sky)" />
          <p className="nb-p" style={{ marginTop: 10, fontSize: 13 }}>학습한 단어 <b>{learned}</b>개 · 오답 <b>{wrong}</b>개 · 틀린 한자 <b>{kanji.wrongWords.length}</b>자</p>
        </div>

        <h2 className="nb-h">기록 초기화</h2>
        <div className="nb-card">
          <p className="nb-p" style={{ marginBottom: 12 }}>처음부터 다시 하고 싶은 기록만 골라서 지울 수 있어요. 지운 기록은 되돌릴 수 없어요.</p>
          <div className="my-reset">
            {['N5', 'N4', 'N3'].map(l => <button key={l} className="nb-btn ghost sm" onClick={() => reset(l, `${l} 진도`)}>{l} 진도</button>)}
            <button className="nb-btn ghost sm" onClick={() => reset(KANJI_LV, '상용한자 진도')}>상용한자</button>
            <button className="nb-btn ghost sm" onClick={() => reset('wrong', '오답노트')}>오답노트</button>
          </div>
          <button className="nb-btn my-danger" style={{ marginTop: 14 }} onClick={() => reset('all', '모든 학습 기록')}>전체 기록 초기화</button>
        </div>

        <button className="nb-btn ghost" style={{ margin: '24px 0 8px' }} onClick={logout}>로그아웃</button>
      </div>
      <BottomNav />
    </div>
  )
}
