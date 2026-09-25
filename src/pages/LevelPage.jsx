import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { LEVELS } from '../lib/data'
import { isUnlocked, opensTomorrow, flashDone, blankDone, dayRoute } from '../lib/study'

// N4·N5는 한 화면에서 탭으로 전환
const BASIC = ['N5', 'N4']
export const LAST_BASIC = 'kotoba.basic'

export default function LevelPage() {
  const { level } = useParams()
  const { getLevel } = useProgress()
  const navigate = useNavigate()
  const toast = useToast()
  const isBasic = BASIC.includes(level)

  useEffect(() => {
    if (isBasic) try { localStorage.setItem(LAST_BASIC, level) } catch {}
  }, [level, isBasic])

  if (!LEVELS[level]) return null
  const st = getLevel(level)
  const days = LEVELS[level].days
  const totalWords = st.passedDays.reduce((s, d) => s + (days[d - 1]?.words.length ?? 0), 0)

  const handleDay = (d) => {
    if (!isUnlocked(level, st, d)) {
      if (opensTomorrow(level, st, d)) toast('오늘 학습은 끝! 이 Day는 내일 열려요 🌙')
      return
    }
    navigate(dayRoute(level, st, d))
  }

  return (
    <div className="screen nb">
      <NbHeader title={isBasic ? 'N4·N5 단어' : 'N3 본 공부'} />
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
          {LEVELS[level].dailyLimit
            ? '하루에 1 Day씩! 테스트를 통과하면 다음 Day는 내일 열려요.'
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
            const u = isUnlocked(level, st, n), p = st.passedDays.includes(n)
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
