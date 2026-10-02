import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NbHeader } from '../components/Layout'
import { useStudyStyle } from '../hooks/useStudyStyle'
import { useToast } from '../components/Toast'
import { QUESTIONS, PACE, COGNITIVE, computeStyle, styleName } from '../lib/studyStyle'

// 공부 성향 테스트 — 처음 로그인하면 꼭 거치고, 홈에서 언제든 다시 할 수 있음
export default function StylePage() {
  const { style, save } = useStudyStyle()
  const navigate = useNavigate()
  const toast = useToast()
  const first = !style
  const [answers, setAnswers] = useState([])
  const [busy, setBusy] = useState(false)

  const step = answers.length
  const done = step === QUESTIONS.length
  const result = done ? computeStyle(answers) : null

  const pick = (v) => setAnswers(a => [...a, v])
  const back = () => {
    if (step > 0) setAnswers(a => a.slice(0, -1))
    else navigate('/home')
  }

  const start = async () => {
    setBusy(true)
    await save({ ...result, answers })
    toast(`${styleName(result)} 공부법으로 맞췄어요 ✨`)
    navigate('/home', { replace: true })
  }

  const q = QUESTIONS[step]
  return (
    <div className="screen nb">
      <NbHeader title="나의 공부법 찾기" onBack={first && step === 0 ? false : back} />
      <div className="scroll">
        {!done ? (
          <>
            <div className="st-step">
              <span>{step + 1} / {QUESTIONS.length}</span>
              <span className="nb-chip" style={{ '--c': 'var(--nb-lime)' }}>{q.tag}</span>
            </div>
            <div className="nb-bar"><i style={{ width: `${(step + 1) / QUESTIONS.length * 100}%` }} /></div>
            {first && step === 0 && (
              <p className="nb-p" style={{ marginTop: 14 }}>
                4개 질문으로 나에게 맞는 단어 공부 방식을 찾아요. 답에 따라 <b>단어 익히기 화면</b>이 달라져요.
              </p>
            )}
            <h1 className="st-q">{q.q}</h1>
            <div className="nb-opts">
              {q.opts.map((o, i) => (
                <button key={o.v} className="nb-opt st-opt" onClick={() => pick(o.v)}>
                  <b className="st-letter">{'ABC'[i]}</b><span>{o.t}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="nb-p" style={{ marginTop: 6 }}>나에게 맞는 공부법은</p>
            <h1 className="nb-hero" style={{ marginTop: 4 }}>
              {PACE[result.pace].emoji}{COGNITIVE[result.cognitive].emoji} {styleName(result)}
            </h1>

            <div className="nb-card">
              <span className="nb-chip" style={{ '--c': 'var(--nb-sky)' }}>학습 호흡 · {PACE[result.pace].name}</span>
              <p className="nb-p" style={{ marginTop: 8 }}>{PACE[result.pace].desc}</p>
            </div>
            <div className="nb-card">
              <span className="nb-chip" style={{ '--c': 'var(--nb-yellow)' }}>단어 익히기 · {COGNITIVE[result.cognitive].name}</span>
              <p className="nb-p" style={{ marginTop: 8 }}>{COGNITIVE[result.cognitive].desc}</p>
            </div>
            <p className="nb-p" style={{ margin: '14px 2px 20px' }}>
              그다음 <b>백지 복습 → 누적 테스트</b> 순서는 모두 같아요. 공부법은 홈에서 언제든 다시 찾을 수 있어요.
            </p>

            <button className="nb-btn" onClick={start} disabled={busy}>이 공부법으로 시작하기</button>
            <button className="nb-btn ghost" style={{ marginTop: 12 }} onClick={() => setAnswers([])} disabled={busy}>처음부터 다시 답하기</button>
          </>
        )}
      </div>
    </div>
  )
}
