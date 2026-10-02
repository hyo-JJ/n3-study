import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NbHeader } from '../components/Layout'
import { useStudyStyle } from '../hooks/useStudyStyle'
import { useToast } from '../components/Toast'
import { QUESTIONS, PACE, COGNITIVE, AI_PROMPT, computeStyle, parseAiResult, styleName } from '../lib/studyStyle'

// 클립보드 API가 막힌 환경(일부 인앱 브라우저)에서도 복사되도록
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {}
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

// 공부 성향 찾기 — 처음 로그인하면 꼭 거치고, 홈에서 언제든 다시 할 수 있음
// 방법 1: 4문항에 답하기 / 방법 2: 평소 쓰는 AI에게 프롬프트로 물어보고 답 붙여넣기
export default function StylePage() {
  const { style, save } = useStudyStyle()
  const navigate = useNavigate()
  const toast = useToast()
  const first = !style
  const [mode, setMode] = useState(null) // null | 'quiz' | 'ai'
  const [answers, setAnswers] = useState([])
  const [aiText, setAiText] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiErr, setAiErr] = useState(false)
  const [busy, setBusy] = useState(false)

  const step = answers.length
  const result = mode === 'quiz' && step === QUESTIONS.length ? { ...computeStyle(answers), source: 'quiz', answers }
    : mode === 'ai' && aiResult ? { ...aiResult, source: 'ai' }
    : null

  const reset = () => { setMode(null); setAnswers([]); setAiResult(null); setAiErr(false) }
  const back = () => {
    if (mode === 'quiz' && step > 0) setAnswers(a => a.slice(0, -1))
    else if (mode === 'ai' && aiResult) setAiResult(null)
    else if (mode) reset()
    else navigate('/home')
  }

  const copy = async () => {
    toast(await copyText(AI_PROMPT) ? '프롬프트를 복사했어요. AI에게 붙여넣어 주세요 📋' : '복사가 안 돼요. 프롬프트를 길게 눌러 직접 복사해 주세요')
  }

  const check = () => {
    const r = parseAiResult(aiText)
    setAiErr(!r)
    setAiResult(r)
    if (r) window.scrollTo(0, 0)
  }

  const start = async () => {
    setBusy(true)
    await save(result)
    toast(`${styleName(result)} 공부법으로 맞췄어요 ✨`)
    navigate('/home', { replace: true })
  }

  return (
    <div className="screen nb">
      <NbHeader title="나의 공부법 찾기" onBack={first && !mode ? false : back} />
      <div className="scroll">
        {result ? (
          <Result result={result} busy={busy} onStart={start} onReset={reset} />
        ) : mode === 'quiz' ? (
          <Quiz step={step} onPick={(v) => setAnswers(a => [...a, v])} />
        ) : mode === 'ai' ? (
          <>
            <p className="nb-p" style={{ marginTop: 6 }}>
              평소 쓰는 AI(ChatGPT·Claude·Gemini 등)는 나와 나눈 대화를 기억하고 있어서 더 정확하게 알려줄 수 있어요.
            </p>

            <h2 className="nb-h">① 프롬프트 복사해서 AI에게 보내기</h2>
            <div className="nb-card st-prompt">{AI_PROMPT}</div>
            <button className="nb-btn" style={{ marginTop: 14 }} onClick={copy}>📋 프롬프트 복사하기</button>
            <p className="nb-p" style={{ marginTop: 10 }}>AI가 질문을 하면 편하게 답해 주세요. 마지막에 <b>STUDYME</b>로 시작하는 결과가 나와요.</p>

            <h2 className="nb-h">② AI의 답 붙여넣기</h2>
            <textarea className="nb-input st-paste" value={aiText} onChange={e => { setAiText(e.target.value); setAiErr(false) }}
              placeholder={'AI의 답을 통째로 붙여넣어도 돼요\n\n예) STUDYME pace=micro cognitive=pragmatic\nREASON: ...'} />
            {aiErr && (
              <p className="st-err">
                AI 답에서 결과를 못 찾았어요. AI에게 "STUDYME 형식으로 결론만 다시 알려줘"라고 해 보거나, 질문에 직접 답해 주세요.
              </p>
            )}
            <button className="nb-btn" style={{ marginTop: 14 }} onClick={check} disabled={!aiText.trim()}>결과 확인하기</button>
            {aiErr && <button className="nb-btn ghost" style={{ marginTop: 12 }} onClick={() => { reset(); setMode('quiz') }}>질문에 직접 답하기</button>}
          </>
        ) : (
          <>
            <h1 className="nb-hero" style={{ fontSize: 28 }}>
              나에게 맞는<br />단어 공부법 찾기
              <small>결과에 따라 단어를 익히는 화면이 달라져요. 방법을 골라 주세요.</small>
            </h1>
            <div className="nb-list">
              <button className="nb-card nb-row" style={{ marginTop: 0 }} onClick={() => setMode('quiz')}>
                <span className="st-big">📝</span>
                <span className="grow"><div className="t">질문에 답하기</div><div className="s">4문항 · 1분이면 끝나요</div></span>
              </button>
              <button className="nb-card nb-row" style={{ marginTop: 0 }} onClick={() => setMode('ai')}>
                <span className="st-big">🤖</span>
                <span className="grow"><div className="t">내 AI에게 물어보기</div><div className="s">ChatGPT·Claude·Gemini 등 평소 쓰는 AI가 나를 더 잘 알아요</div></span>
                <span className="nb-chip" style={{ '--c': 'var(--nb-lime)' }}>정확</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Quiz({ step, onPick }) {
  const q = QUESTIONS[step]
  return (
    <>
      <div className="st-step">
        <span>{step + 1} / {QUESTIONS.length}</span>
        <span className="nb-chip" style={{ '--c': 'var(--nb-lime)' }}>{q.tag}</span>
      </div>
      <div className="nb-bar"><i style={{ width: `${(step + 1) / QUESTIONS.length * 100}%` }} /></div>
      <h1 className="st-q">{q.q}</h1>
      <div className="nb-opts">
        {q.opts.map((o, i) => (
          <button key={o.v} className="nb-opt st-opt" onClick={() => onPick(o.v)}>
            <b className="st-letter">{'ABC'[i]}</b><span>{o.t}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function Result({ result, busy, onStart, onReset }) {
  return (
    <>
      <p className="nb-p" style={{ marginTop: 6 }}>{result.source === 'ai' ? '내 AI가 고른 공부법은' : '나에게 맞는 공부법은'}</p>
      <h1 className="nb-hero" style={{ marginTop: 4 }}>
        {PACE[result.pace].emoji}{COGNITIVE[result.cognitive].emoji} {styleName(result)}
      </h1>

      {result.reason && (
        <div className="nb-card">
          <span className="nb-chip" style={{ '--c': 'var(--nb-lime)' }}>🤖 AI가 말한 이유</span>
          <p className="nb-p" style={{ marginTop: 8 }}>{result.reason}</p>
        </div>
      )}
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

      <button className="nb-btn" onClick={onStart} disabled={busy}>이 공부법으로 시작하기</button>
      <button className="nb-btn ghost" style={{ marginTop: 12 }} onClick={onReset} disabled={busy}>다른 방법으로 다시 찾기</button>
    </>
  )
}
