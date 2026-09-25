import { useNavigate } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { LEVELS } from '../lib/data'

export default function ReviewPage() {
  const navigate = useNavigate()
  const { getLevel } = useProgress()
  const levels = Object.keys(LEVELS)
  const wrong = levels.reduce((s, l) => s + getLevel(l).wrongWords.length, 0)
  const passed = levels.reduce((s, l) => s + getLevel(l).passedDays.length, 0)

  const items = [
    { to: '/wrong', ico: '📝', c: 'var(--nb-pink)', t: '오답노트', s: '테스트·게임에서 틀린 단어만 모아서 다시', chip: `${wrong}개` },
    { to: '/weekend', ico: '🔄', c: 'var(--nb-beige)', t: '주말 복습', s: '이번 주에 끝낸 Day를 플래시카드·테스트로', chip: `완료 ${passed} Day` },
  ]

  return (
    <div className="screen nb">
      <NbHeader title="복습" />
      <div className="scroll">
        <p className="nb-p" style={{ marginBottom: 16 }}>외운 단어는 다시 볼수록 오래 기억에 남아요. 오답노트는 매일, 주말 복습은 주말에 해보세요.</p>
        <div className="nb-list">
          {items.map(it => (
            <button key={it.to} className="nb-card nb-row" style={{ marginTop: 0 }} onClick={() => navigate(it.to)}>
              <span className="nb-ico" style={{ '--c': it.c, fontSize: 22 }}>{it.ico}</span>
              <span className="grow"><div className="t">{it.t}</div><div className="s">{it.s}</div></span>
              <span className="nb-chip" style={{ '--c': it.c }}>{it.chip}</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
