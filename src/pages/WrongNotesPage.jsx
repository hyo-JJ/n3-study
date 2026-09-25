import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { useActiveLevel } from '../hooks/useActiveLevel'
import { LEVELS } from '../lib/data'

function WrongFlash({ words, onDone, phase }) {
  const { update } = useProgress()
  const toast = useToast()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const navigate = useNavigate()

  const w = words[idx]
  const total = words.length

  const flip = () => setFlipped(true)

  const result = (ok) => {
    if (ok) {
      update(w.level || 'N3', st => ({
        ...st,
        wrongWords: st.wrongWords.filter(x => !(x.dn === w.dn && x.no === w.no))
      }))
      toast('✅ 오답노트에서 삭제!')
    }
    const nextIdx = idx + 1
    if (nextIdx >= total) { toast('완료!'); setTimeout(onDone, 600) }
    else { setIdx(nextIdx); setFlipped(false) }
  }

  return (
    <div className="fc-wrap">
      <div className="fc-meta">
        <span className="fc-cnt">{idx + 1} / {total}</span>
        <span className="phase-badge">{phase || '오답 플래시카드'}</span>
      </div>
      <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / total * 100).toFixed(0)}%` }} /></div>
      <div className={`flashcard${flipped ? ' flipped' : ''}`} onClick={flip}>
        <div className="fc-word jp">{w.word}</div>
        {flipped && <div className="fc-meaning">{w.meaning}</div>}
        {!flipped && <div className="fc-tap">탭해서 뜻 확인</div>}
      </div>
      <div className="gap" />
      {flipped ? (
        <div className="btn-row">
          <button className="btn btn-err" onClick={() => result(false)}>❌ 아직 모름</button>
          <button className="btn btn-ok" onClick={() => result(true)}>✅ 알았어요!</button>
        </div>
      ) : (
        <button className="btn btn-accent" onClick={flip}>뒤집기</button>
      )}
    </div>
  )
}

export default function WrongNotesPage() {
  const { getLevel } = useProgress()
  const navigate = useNavigate()
  const [studying, setStudying] = useState(false)
  const [activeLevel, setActiveLevel] = useActiveLevel()
  const st = getLevel(activeLevel)

  if (studying && st.wrongWords.length > 0) {
    const words = [...st.wrongWords].sort(() => Math.random() - .5).map(w => ({ ...w, level: activeLevel }))
    return (
      <div className="screen">
        <Topbar title="오답 재학습" onBack={() => setStudying(false)} />
        <WrongFlash words={words} onDone={() => setStudying(false)} />
      </div>
    )
  }

  return (
    <div className="screen">
      <Topbar title="오답노트" onBack={() => navigate('/review')} />
      <div className="scroll">
        <div className="level-tabs">
          {Object.entries(LEVELS).map(([key, val]) => (
            <button key={key} className={`level-tab${activeLevel === key ? ' active' : ''}`} onClick={() => setActiveLevel(key)}>
              {val.label}
            </button>
          ))}
        </div>
        {st.wrongWords.length === 0 ? (
          <div className="empty">
            <span className="ico">🎉</span>
            오답노트가 비어있어요!<br />모든 단어를 잘 알고 있네요.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="sec-hd" style={{ margin: 0 }}>오답 {st.wrongWords.length}개</div>
              <button className="btn btn-accent btn-sm" onClick={() => setStudying(true)}>플래시카드 학습</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {st.wrongWords.map((w, i) => (
                <div key={i} className="wrong-card">
                  <div>
                    <div className="jp" style={{ fontSize: 26, fontWeight: 700 }}>{w.word}</div>
                    <div style={{ fontSize: 14, color: 'var(--label3)', marginTop: 3 }}>{w.meaning}</div>
                    <div style={{ fontSize: 11, color: 'var(--label4)', marginTop: 2 }}>Day {w.dn}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
