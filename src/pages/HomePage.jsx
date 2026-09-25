import { useNavigate } from 'react-router-dom'
import { Topbar, BottomNav } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useProgress, today } from '../hooks/useProgress'
import { LEVELS } from '../lib/data'
import { useToast } from '../components/Toast'
import { useActiveLevel } from '../hooks/useActiveLevel'

export default function HomePage() {
  const user = useAuth()
  const { getLevel } = useProgress()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeLevel, setActiveLevel] = useActiveLevel()

  const name = user?.user_metadata?.full_name || '학생'
  const h = new Date().getHours()
  const greeting = h < 12 ? `좋은 아침, ${name}님 ☀️` : h < 18 ? `안녕하세요, ${name}님 👋` : `수고하셨어요, ${name}님 🌙`
  const dow = new Date().getDay()
  const sub = (dow === 0 || dow === 6) ? '주말 — 이번 주 학습 내용 복습하기' : '평일 학습 — 꾸준히 한 Day씩!'

  const st = getLevel(activeLevel)
  const days = LEVELS[activeLevel]?.days ?? []

  // 하루에 Day 1개(N3만): 이전 Day를 오늘 통과했다면 다음 Day는 내일 열림
  const passedToday = (d) => LEVELS[activeLevel]?.dailyLimit && st.passedAt?.[d] === today()
  const unlocked = (d) => d === 1 || st.passedDays.includes(d) || (st.passedDays.includes(d - 1) && !passedToday(d - 1))
  const tomorrow = (d) => !unlocked(d) && st.passedDays.includes(d - 1)
  const flashDone = (d) => (st.flashProgress[d] || 0) >= days[d - 1]?.words.length
  const blankDone = (d) => (st.blankProgress[d] || 0) >= days[d - 1]?.words.length
  const passed = (d) => st.passedDays.includes(d)

  const totalWords = st.passedDays.reduce((s, d) => s + (days[d - 1]?.words.length ?? 0), 0)

  const handleDay = (dayNum) => {
    const u = unlocked(dayNum)
    if (!u) {
      if (tomorrow(dayNum)) toast('오늘 학습은 끝! 이 Day는 내일 열려요 🌙')
      return
    }
    const p = passed(dayNum)
    const fd = flashDone(dayNum)
    const bd = blankDone(dayNum)
    if (p || !fd) navigate(`/learn/${activeLevel}/${dayNum}/flash`)
    else if (!bd) navigate(`/learn/${activeLevel}/${dayNum}/blank`)
    else navigate(`/quiz/${activeLevel}/${dayNum}`)
  }

  return (
    <div className="screen">
      <Topbar title='こと<em>ば</em>' />
      <div className="scroll">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>{greeting}</h2>
          <p style={{ fontSize: 14, color: 'var(--label3)' }}>{sub}</p>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-n">{st.passedDays.length}</div><div className="stat-l">완료 Day</div></div>
          <div className="stat"><div className="stat-n">{totalWords}</div><div className="stat-l">학습 단어</div></div>
          <div className="stat"><div className="stat-n">{st.wrongWords.length}</div><div className="stat-l">오답</div></div>
        </div>

        <div className="level-tabs">
          {Object.entries(LEVELS).map(([key, val]) => (
            <button key={key} className={`level-tab${activeLevel === key ? ' active' : ''}`} onClick={() => setActiveLevel(key)}>
              {val.label}
            </button>
          ))}
        </div>

        <div className="sec-hd">학습 Day</div>
        <div className="day-list">
          {days.map((d, i) => {
            const n = i + 1
            const u = unlocked(n), p = passed(n), fd = flashDone(n), bd = blankDone(n)
            let pill, pillC, badgeC
            if (p)           { pill = '완료 ✓'; pillC = 'done'; badgeC = 'done' }
            else if (u && fd && bd) { pill = '테스트'; pillC = 'test'; badgeC = 'go' }
            else if (u && fd) { pill = '복습'; pillC = 'go'; badgeC = 'go' }
            else if (u)      { pill = '시작'; pillC = 'go'; badgeC = 'go' }
            else if (tomorrow(n)) { pill = '내일 열림'; pillC = 'lock'; badgeC = 'lock' }
            else             { pill = '잠김'; pillC = 'lock'; badgeC = 'lock' }
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
