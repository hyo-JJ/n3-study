import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { LEVELS } from '../lib/data'
import { isUnlocked, opensTomorrow, flashDone, blankDone, dayRoute, levelLocked } from '../lib/study'
import { basicLevels, isDaily, visibleLevels, prevLevel } from '../lib/level'

// 내 레벨보다 쉬운 레벨(제한 없음)은 한 화면에서 탭으로 전환
export const LAST_BASIC = 'kotoba.basic'

export default function LevelPage() {
  const { level } = useParams()
  const { getLevel } = useProgress()
  const navigate = useNavigate()
  const toast = useToast()
  const BASIC = basicLevels()
  const isBasic = BASIC.includes(level)

  useEffect(() => {
    if (isBasic) try { localStorage.setItem(LAST_BASIC, level) } catch {}
  }, [level, isBasic])

  // 내 레벨에서 볼 수 없는 레벨이면 홈으로
  if (!LEVELS[level] || !visibleLevels().includes(level)) return <Navigate to="/home" replace />
  const locked = levelLocked(level, getLevel)
  const st = getLevel(level)
  const days = LEVELS[level].days
  const totalWords = st.passedDays.reduce((s, d) => s + (days[d - 1]?.words.length ?? 0), 0)

  const handleDay = (d) => {
    if (locked) { toast(`${prevLevel(level)}를 모두 끝내면 열려요 🔒`); return }
    if (!isUnlocked(level, st, d)) {
      if (opensTomorrow(level, st, d)) toast('오늘 학습은 끝! 이 Day는 내일 열려요 🌙')
      return
    }
    navigate(dayRoute(level, st, d))
  }

  return (
    <div className="screen nb">
      <NbHeader title={isBasic ? `${BASIC.join('·')} 단어` : `${level} 본 공부`} />
      <div className="scroll">
        {isBasic && (
          <div className="nb-tabs">
            {BASIC.map(l => (
              <button key={l} className={`nb-tab${l === level ? ' on' : ''}`} onClick={() => navigate(`/study/${l}`, { replace: true })}>
                {LEVELS[l].label}
              </button>
            ))}
          </div>
        )}
        <p className="nb-p" style={{ marginBottom: 14 }}>
          {locked ? `${prevLevel(level)} 단어를 모두 끝내면 열려요. 그때부터 ${level}도 하루에 1 Day씩!`
            : isDaily(level) ? '하루에 1 Day씩! 테스트를 통과하면 다음 Day는 내일 열려요.'
            : '개수 제한 없이 테스트를 통과하면 다음 Day가 바로 열려요.'}
        </p>

        <div className="stats">
          <div className="stat"><div className="stat-n">{st.passedDays.length}<small>/{days.length}</small></div><div className="stat-l">완료 Day</div></div>
          <div className="stat"><div className="stat-n">{totalWords}</div><div className="stat-l">학습 단어</div></div>
          <div className="stat"><div className="stat-n">{st.wrongWords.length}</div><div className="stat-l">오답</div></div>
        </div>

        <div className="day-list">
          {days.map((d, i) => {
            const n = i + 1
            const u = !locked && isUnlocked(level, st, n), p = st.passedDays.includes(n)
            const fd = flashDone(level, st, n), bd = blankDone(level, st, n)
            let pill, pillC, badgeC
            if (p)                { pill = '완료 ✓'; pillC = 'done'; badgeC = 'done' }
            else if (u && fd && bd) { pill = '테스트'; pillC = 'test'; badgeC = 'go' }
            else if (u && fd)     { pill = '복습'; pillC = 'go'; badgeC = 'go' }
            else if (u)           { pill = '시작'; pillC = 'go'; badgeC = 'go' }
            else if (opensTomorrow(level, st, n)) { pill = '내일 열림'; pillC = 'lock'; badgeC = 'lock' }
            else                  { pill = '잠김'; pillC = 'lock'; badgeC = 'lock' }
            return (
              <button key={n} className={`day-card${u ? '' : ' locked'}`} onClick={() => handleDay(n)}>
                <div className={`day-badge ${badgeC}`}>
                  <span className="dn">{n}</span>
                  <span className="dl">DAY</span>
                </div>
                <div className="day-info">
                  <div className="day-nm">{d.topic}</div>
                  <div className="day-wc">{d.words.length}단어</div>
                </div>
                <span className={`pill ${pillC}`}>{pill}</span>
              </button>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
