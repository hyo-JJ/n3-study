import { useMemo, useState } from 'react'
import { Topbar } from '../../components/Layout'
import { useLearnStep, BreakCard } from '../../hooks/useLearnStep'
import Furigana from '../../components/Furigana'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i)

// 퀴즈형: 설명 없이 바로 "이 단어의 뜻은?" 4지선다 → 답을 고르면 단어 카드 공개
// 처음 보는 단어라 틀려도 오답노트엔 안 넣고, 이번 Day 끝에 틀린 단어만 한 번 더
export default function QuizLearn({ level, dayNum, dayData }) {
  const words = dayData.words
  const total = words.length
  const step = useLearnStep(level, dayNum, total)
  const [queue, setQueue] = useState(() => range(step.start, total))
  const [pos, setPos] = useState(0)
  const [retry, setRetry] = useState(false) // 틀린 단어 다시 풀기 라운드
  const [wrong, setWrong] = useState([])
  const [picked, setPicked] = useState(null)
  const [pause, setPause] = useState(null) // 'break' | 'retry'

  const wi = queue[pos]
  const word = words[wi]

  const opts = useMemo(() => {
    const others = [...new Set(shuffle(words).map(w => w.meaning))].filter(m => m !== word.meaning).slice(0, 3)
    return shuffle([word.meaning, ...others])
  }, [wi, retry]) // eslint-disable-line react-hooks/exhaustive-deps

  const answered = picked !== null
  const ok = picked === word.meaning

  const answer = (opt) => {
    if (answered) return
    setPicked(opt)
    if (opt !== word.meaning && !retry && !wrong.includes(wi)) setWrong(w => [...w, wi])
  }

  const next = () => {
    setPicked(null)
    if (!retry) step.saveProgress(wi + 1)
    if (pos + 1 < queue.length) {
      setPos(pos + 1)
      if (!retry && step.isBreak(wi + 1)) setPause('break')
      return
    }
    if (!retry && wrong.length) {
      setQueue(shuffle(wrong)); setPos(0); setRetry(true); setPause('retry')
      return
    }
    step.finish()
  }

  const n = retry ? `다시 ${pos + 1} / ${queue.length}` : `${wi + 1} / ${total}`
  const pct = retry ? (pos + 1) / queue.length : (wi + 1) / total
  const { chunk } = step
  const set = chunk ? `${Math.floor(wi / chunk) + 1}/${Math.ceil(total / chunk)}세트` : ''

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} · ${dayData.topic}`} onBack={step.exit} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{n}{set && !retry && ` · ${set}`}</span>
          <span className="phase-badge">{retry ? '① 틀린 단어 다시' : '① 바로 퀴즈'}</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${(pct * 100).toFixed(0)}%` }} /></div>

        {pause === 'break' ? (
          <BreakCard done={wi} total={total} chunk={chunk} onContinue={() => setPause(null)} onStop={step.stop} />
        ) : pause === 'retry' ? (
          <>
            <div className="result-card">
              <div className="r-score" style={{ fontSize: 52 }}>🎯</div>
              <div className="r-msg">한 바퀴 끝! 틀린 {queue.length}단어만 다시 풀어요</div>
              <div className="r-sub">맞힐 때까지가 아니라 딱 한 번만 더 볼게요</div>
            </div>
            <button className="btn btn-accent" onClick={() => setPause(null)}>다시 풀기 →</button>
          </>
        ) : (
          <>
            <div className="quiz-q">
              <div className="quiz-word jp" style={{ fontSize: word.word.length > 5 ? 34 : undefined, wordBreak: 'keep-all' }}>
                <Furigana word={word.word} reading={word.reading} show={answered} />
              </div>
              <div className="quiz-hint">{answered ? (ok ? '정답! 👏' : `정답은 「${word.meaning}」`) : '이 단어의 뜻은?'}</div>
            </div>

            <div className="opts">
              {opts.map(opt => {
                let cls = 'opt'
                if (answered) cls += opt === word.meaning ? ' correct' : opt === picked ? ' wrong' : ' reveal'
                return <button key={opt} className={cls} onClick={() => answer(opt)}>{opt}</button>
              })}
            </div>

            {answered && (
              <div className="fc-actions">
                <button className="fc-save" onClick={() => step.toggleSave(word)}>{step.isSaved(word) ? '★ 단어장에 담김' : '☆ 단어장에 담기'}</button>
              </div>
            )}

            <div className="gap" />
            {answered && <button className="btn btn-accent" onClick={next}>다음 →</button>}
          </>
        )}
      </div>
    </div>
  )
}
