import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useStudyStyle } from '../hooks/useStudyStyle'
import { useLearnStep, BreakCard } from '../hooks/useLearnStep'
import { getDay } from '../lib/data'
import WritePad from '../components/WritePad'
import Furigana from '../components/Furigana'
import ListLearn from './learn/ListLearn'
import QuizLearn from './learn/QuizLearn'

// ① 단어 익히기 — 공부 성향(인지 선호)에 맞는 화면으로
export default function FlashcardPage() {
  const { level, day } = useParams()
  const dayData = getDay(level, Number(day))
  const { style } = useStudyStyle()
  if (!dayData) return null
  const props = { level, dayNum: Number(day), dayData }
  if (style?.cognitive === 'textual') return <ListLearn {...props} />
  if (style?.cognitive === 'pragmatic') return <QuizLearn {...props} />
  return <CardLearn {...props} />
}

// 카드형: 한 장씩 크게, 탭하면 뜻
function CardLearn({ level, dayNum, dayData }) {
  const words = dayData.words
  const total = words.length
  const step = useLearnStep(level, dayNum, total)
  const [idx, setIdx] = useState(step.start)
  const [flipped, setFlipped] = useState(false)
  const [paused, setPaused] = useState(false)
  // 쓰기 연습을 펼쳐 둔 사람은 다음 카드에서도 계속 펼쳐지도록 기억
  const [writing, setWriting] = useState(() => { try { return localStorage.getItem('fc-writing') === '1' } catch { return false } })
  const toggleWriting = () => {
    setWriting(w => { try { localStorage.setItem('fc-writing', w ? '0' : '1') } catch {} return !w })
  }

  const word = words[idx]
  const pct = `${((idx + 1) / total * 100).toFixed(0)}%`

  const flip = () => setFlipped(true)

  const next = () => {
    if (!flipped) { flip(); return }
    const nextIdx = idx + 1
    step.saveProgress(nextIdx)
    if (nextIdx >= total) { step.finish(); return }
    setIdx(nextIdx)
    setFlipped(false)
    if (step.isBreak(nextIdx)) setPaused(true)
  }

  const prev = () => {
    if (idx > 0) { setIdx(idx - 1); setFlipped(false) }
  }

  const saved = step.isSaved(word)
  const { chunk } = step
  const set = chunk ? `${Math.floor(idx / chunk) + 1}/${Math.ceil(total / chunk)}세트` : ''

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} · ${dayData.topic}`} onBack={step.exit} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{idx + 1} / {total}{set && ` · ${set}`}</span>
          <span className="phase-badge">① 단어 카드</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: pct }} /></div>

        {paused ? (
          <BreakCard done={idx} total={total} chunk={chunk} onContinue={() => setPaused(false)} onStop={step.stop} />
        ) : (
          <>
            <div className={`flashcard${flipped ? ' flipped' : ''}${flipped && writing ? ' compact' : ''}`} onClick={flip}>
              <div className="fc-word jp"><Furigana word={word.word} reading={word.reading} show={flipped} /></div>
              {flipped && <div className="fc-meaning">{word.meaning}</div>}
              {!flipped && <div className="fc-tap">탭해서 뜻 확인</div>}
            </div>

            {flipped && (
              <div className="fc-actions">
                <button className="fc-save" onClick={() => step.toggleSave(word)}>{saved ? '★ 단어장에 담김' : '☆ 단어장에 담기'}</button>
                <button className={`fc-save${writing ? ' on' : ''}`} onClick={toggleWriting}>{writing ? '✍️ 쓰기 접기' : '✍️ 쓰기 연습'}</button>
              </div>
            )}

            {flipped && writing && (
              <div className="wp-reveal">
                <WritePad key={idx} word={word.word} />
              </div>
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
          </>
        )}
      </div>
    </div>
  )
}
