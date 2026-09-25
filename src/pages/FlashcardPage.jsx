import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { getDay } from '../lib/data'
import WritePad from '../components/WritePad'
import Furigana from '../components/Furigana'

export default function FlashcardPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const dayData = getDay(level, dayNum)
  const navigate = useNavigate()
  const toast = useToast()
  const { getLevel, update } = useProgress()
  const st = getLevel(level)

  const reviewOnly = st.passedDays.includes(dayNum)
  const [idx, setIdx] = useState(reviewOnly ? 0 : (st.flashProgress[dayNum] || 0))
  const [flipped, setFlipped] = useState(false)

  if (!dayData) return null
  const words = dayData.words
  const word = words[idx]
  const total = words.length
  const pct = `${((idx + 1) / total * 100).toFixed(0)}%`

  const flip = () => setFlipped(true)

  const next = useCallback(() => {
    if (!flipped) { flip(); return }
    const nextIdx = idx + 1
    if (!reviewOnly) {
      update(level, st => ({ ...st, flashProgress: { ...st.flashProgress, [dayNum]: nextIdx } }))
    }
    if (nextIdx >= total) {
      if (reviewOnly) { toast('플래시카드 복습 완료! ✅'); navigate('/home'); return }
      toast('플래시카드 완료! 백지 복습으로 이동합니다 📝')
      setTimeout(() => navigate(`/learn/${level}/${dayNum}/blank`), 700)
    } else {
      setIdx(nextIdx)
      setFlipped(false)
    }
  }, [flipped, idx, total, reviewOnly, level, dayNum, navigate, toast, update])

  const prev = () => {
    if (idx > 0) { setIdx(idx - 1); setFlipped(false) }
  }

  const exitConfirm = () => {
    if (confirm('학습을 중단할까요?\n(진행 상황은 저장됩니다)')) navigate('/home')
  }

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} · ${dayData.topic}`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{idx + 1} / {total}</span>
          <span className="phase-badge">① 플래시카드</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: pct }} /></div>

        <div className={`flashcard${flipped ? ' flipped' : ''}`} onClick={flip}>
          <div className="fc-word jp"><Furigana word={word.word} reading={word.reading} show={flipped} /></div>
          {flipped && <div className="fc-meaning">{word.meaning}</div>}
          {!flipped && <div className="fc-tap">탭해서 뜻 확인</div>}
        </div>

        {flipped && (
          <WritePad key={idx} word={word.word} />
        )}

        <div className="gap" />
        {flipped ? (
          <div className="btn-row">
            <button className="btn btn-muted" onClick={prev}>← 이전</button>
            <button className="btn btn-accent" onClick={next}>다음 →</button>
          </div>
        ) : (
          <button className="btn btn-accent" onClick={next}>뒤집기</button>
        )}
      </div>
    </div>
  )
}
