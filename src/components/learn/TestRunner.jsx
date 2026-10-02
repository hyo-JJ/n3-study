import { useEffect, useRef, useState } from 'react'

// 4지선다 테스트 공통 — 누적 테스트·한자 테스트·문법 퀴즈
// question: { key, q(문제 본문), hint, answer, opts, jp(보기 일본어 글꼴), after?(답한 뒤 보여줄 설명), missQ(틀린 문제 목록에 쓸 문제 글) }
// feedback — immediate: 매번 정답 공개 / adaptive: 맞히면 바로 다음, 틀리면 공개 / delayed: 다 푼 뒤 틀린 것만 모아서(결과 화면)
// variant — 'nb'(네오브루탈 화면) | 'plain'
export default function TestRunner({ questions, feedback = 'immediate', badge, onAnswer, onDone, variant = 'plain' }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [misses, setMisses] = useState([])
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const q = questions[idx]
  const total = questions.length
  if (!q) return null
  const delayed = feedback === 'delayed'
  const answered = picked !== null && !delayed
  const ok = picked === q.answer

  const next = (c, m) => {
    clearTimeout(timer.current)
    if (idx + 1 >= total) { onDone({ correct: c, total, misses: m }); return }
    setIdx(idx + 1)
    setPicked(null)
  }

  const pick = (opt) => {
    if (picked !== null) return
    const right = opt === q.answer
    const c = correct + (right ? 1 : 0)
    const m = right ? misses : [...misses, { q: q.missQ, a: q.answer, picked: opt }]
    setPicked(opt); setCorrect(c); setMisses(m)
    onAnswer?.(q, right)
    if (delayed) next(c, m)
    else if (right && feedback === 'adaptive') timer.current = setTimeout(() => next(c, m), 650)
  }

  const nb = variant === 'nb'
  const optCls = (opt) => {
    let c = nb ? 'nb-opt' : 'opt'
    if (q.jp) c += ' jp'
    if (!answered) return c
    if (opt === q.answer) return c + (nb ? ' ok' : ' correct')
    if (opt === picked) return c + (nb ? ' no' : ' wrong')
    return c + (nb ? ' dim' : ' reveal')
  }
  const pct = `${((idx + 1) / total * 100).toFixed(0)}%`
  const showNext = answered && !(ok && feedback === 'adaptive')

  return (
    <>
      {nb ? (
        <>
          <div className="nb-hud"><span>{idx + 1} / {total}</span><span>{delayed ? '다 풀고 확인' : `정답 ${correct}`}</span></div>
          <div className="nb-bar"><i style={{ width: pct }} /></div>
        </>
      ) : (
        <>
          <div className="fc-meta">
            <span className="fc-cnt">{idx + 1} / {total}</span>
            {badge && <span className="phase-badge">{typeof badge === 'function' ? badge(q) : badge}</span>}
          </div>
          <div className="prog"><div className="prog-fill" style={{ width: pct }} /></div>
        </>
      )}

      <div className={nb ? 'nb-card nb-q' : 'quiz-q'} style={nb ? { marginTop: 12 } : undefined}>
        {q.q(answered)}
        <div className={nb ? 'hint' : 'quiz-hint'}>{answered ? (ok ? '정답! 👏' : `정답은 「${q.answer}」`) : q.hint}</div>
      </div>

      <div className={nb ? 'nb-opts' : 'opts'}>
        {q.opts.map(opt => <button key={opt} className={optCls(opt)} onClick={() => pick(opt)}>{opt}</button>)}
      </div>

      {answered && q.after && <div className={nb ? 'nb-card' : 'fc-detail'} style={{ marginTop: 14 }}>{q.after}</div>}

      <div className="gap" />
      {showNext && (
        <button className={nb ? 'nb-btn' : 'btn btn-accent'} onClick={() => next(correct, misses)}>
          {idx === total - 1 ? '결과 보기 →' : '다음 →'}
        </button>
      )}
    </>
  )
}
