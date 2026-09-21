import { useNavigate } from 'react-router-dom'
import { Topbar, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { getLevelDays } from '../lib/data'

export default function WeekendPage() {
  const navigate = useNavigate()
  const { getLevel } = useProgress()
  const level = 'N3'
  const st = getLevel(level)
  const days = getLevelDays(level)
  const passed = st.passedDays

  if (!passed.length) {
    return (
      <div className="screen">
        <Topbar title="주말 복습" />
        <div className="scroll">
          <div className="empty"><span className="ico">📚</span>아직 완료한 Day가 없어요.<br />평일에 학습을 시작해보세요!</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  const weekDays = passed.slice(-5)
  const totalWords = weekDays.reduce((s, d) => s + (days[d - 1]?.words.length ?? 0), 0)
  const lastDay = passed[passed.length - 1]

  return (
    <div className="screen">
      <Topbar title="주말 복습" />
      <div className="scroll">
        <div className="review-info">
          📋 이번 주: {weekDays.map(d => `Day${d}`).join(', ')}<br />복습 단어 {totalWords}개
        </div>
        <div className="sec-hd">복습 방법 선택</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-accent" onClick={() => navigate(`/learn/${level}/${weekDays[0]}/flash`)}>
            📖 이번 주 플래시카드 복습
          </button>
          <button className="btn btn-muted" onClick={() => navigate(`/quiz/${level}/${lastDay}`)}>
            🎯 이번 주 범위 테스트
          </button>
          <div className="sec-hd" style={{ marginTop: 12 }}>전체 누적 복습</div>
          <button className="btn btn-muted" onClick={() => navigate(`/quiz/${level}/${lastDay}`)}>
            🔁 전체 누적 테스트 (Day 1~{lastDay})
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
