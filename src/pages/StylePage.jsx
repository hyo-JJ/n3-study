import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NbHeader } from '../components/Layout'
import { useStudyStyle } from '../hooks/useStudyStyle'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { PACE, COGNITIVE, PROFILE, AI_PROMPT, parseAiResult, styleName } from '../lib/studyStyle'

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

// 나의 공부법 — 평소 쓰는 AI에게 프롬프트로 물어보고, AI의 답을 붙여넣어 학습 프로필로 저장
// 처음 로그인하면 꼭 거치고, 이후엔 홈에서 프로필을 보거나 다시 물어볼 수 있음
export default function StylePage() {
  const { style, save } = useStudyStyle()
  const { my, updateMy } = useProgress()
  const navigate = useNavigate()
  const toast = useToast()
  const [asking, setAsking] = useState(!style)
  const [aiText, setAiText] = useState('')
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  const back = () => {
    if (result) setResult(null)
    else if (asking && style) setAsking(false)
    else navigate('/home')
  }

  const copy = async () => {
    toast(await copyText(AI_PROMPT) ? '프롬프트를 복사했어요. AI에게 붙여넣어 주세요 📋' : '복사가 안 돼요. 프롬프트를 길게 눌러 직접 복사해 주세요')
  }

  const check = () => {
    const r = parseAiResult(aiText)
    setErr(!r)
    setResult(r)
    if (r) window.scrollTo(0, 0)
  }

  const start = async () => {
    setBusy(true)
    if (result.profile) updateMy(m => ({ ...m, profile: { text: result.profile, at: new Date().toISOString() } }))
    await save(result)
    toast(`${styleName(result)} 공부법으로 맞췄어요 ✨`)
    navigate('/home', { replace: true })
  }

  return (
    <div className="screen nb">
      <NbHeader title={asking ? '나의 공부법 찾기' : '내 학습 프로필'} onBack={!style && !result ? false : back} />
      <div className="scroll">
        {!asking ? (
          <>
            <Profile s={style} text={my.profile?.text} />
            <button className="nb-btn" style={{ marginTop: 20 }} onClick={() => setAsking(true)}>🤖 AI에게 다시 물어보기</button>
          </>
        ) : result ? (
          <>
            <p className="nb-p" style={{ marginTop: 6 }}>내 AI가 찾아준 공부법은</p>
            <Profile s={result} text={result.profile} />
            <button className="nb-btn" style={{ marginTop: 20 }} onClick={start} disabled={busy}>이 공부법으로 시작하기</button>
            <button className="nb-btn ghost" style={{ marginTop: 12 }} onClick={() => setResult(null)} disabled={busy}>AI 답 다시 붙여넣기</button>
          </>
        ) : (
          <>
            <h1 className="nb-hero" style={{ fontSize: 28 }}>
              내 AI에게<br />공부법 물어보기
              <small>평소 쓰는 AI(ChatGPT·Claude·Gemini 등)가 몇 가지를 물어보고, 나에게 맞는 JLPT 공부법을 찾아줘요. 질문엔 내 말로 편하게 답하면 돼요.</small>
            </h1>

            <h2 className="nb-h">① 프롬프트 복사해서 AI에게 보내기</h2>
            <div className="nb-card st-prompt">{AI_PROMPT}</div>
            <button className="nb-btn" style={{ marginTop: 14 }} onClick={copy}>📋 프롬프트 복사하기</button>

            <h2 className="nb-h">② AI와 대화하기</h2>
            <p className="nb-p">AI가 질문을 하나씩 해요. 최근에 어떻게 공부했는지 떠올리며 자유롭게 답해 주세요. 끝나면 <b>[나의 JLPT 학습 프로필]</b>과 <b>STUDYME</b>로 시작하는 줄이 나와요.</p>

            <h2 className="nb-h">③ AI의 마지막 답 붙여넣기</h2>
            <textarea className="nb-input st-paste" value={aiText} onChange={e => { setAiText(e.target.value); setErr(false) }}
              placeholder={'AI의 마지막 답을 통째로 붙여넣어 주세요\n\n[나의 JLPT 학습 프로필]\n...\nSTUDYME pace=... input=... practice=...'} />
            {err && (
              <p className="st-err">
                AI 답에서 STUDYME 줄을 못 찾았어요. AI에게 "앱 연동 코드(STUDYME 줄)도 출력해 줘"라고 한 뒤 다시 붙여넣어 주세요.
              </p>
            )}
            <button className="nb-btn" style={{ marginTop: 14 }} onClick={check} disabled={!aiText.trim()}>결과 확인하기</button>
          </>
        )}
      </div>
    </div>
  )
}

// 학습 프로필 — 앱에 적용되는 것(세트 크기·단어 익히기 화면) + AI가 정한 요소 + AI가 쓴 추천 공부법
function Profile({ s, text }) {
  const items = PROFILE.filter(p => s[p.key] && p.v[s[p.key]])
  return (
    <>
      <h1 className="nb-hero" style={{ marginTop: 4 }}>
        {PACE[s.pace].emoji}{COGNITIVE[s.cognitive].emoji} {styleName(s)}
      </h1>

      <h2 className="nb-h" style={{ marginTop: 0 }}>앱에 이렇게 적용돼요</h2>
      <div className="nb-card">
        <span className="nb-chip" style={{ '--c': 'var(--nb-sky)' }}>학습 호흡 · {PACE[s.pace].name}</span>
        <p className="nb-p" style={{ marginTop: 8 }}>{PACE[s.pace].desc}</p>
      </div>
      <div className="nb-card">
        <span className="nb-chip" style={{ '--c': 'var(--nb-yellow)' }}>단어 익히기 · {COGNITIVE[s.cognitive].name}</span>
        <p className="nb-p" style={{ marginTop: 8 }}>{COGNITIVE[s.cognitive].desc}</p>
      </div>
      <p className="nb-p" style={{ margin: '12px 2px 0' }}>그다음 <b>백지 복습 → 누적 테스트</b> 순서는 그대로예요.</p>

      {items.length > 2 && (
        <>
          <h2 className="nb-h">AI 학습 프로필</h2>
          <div className="nb-card st-prof">
            {items.map(p => (
              <div key={p.key} className="st-prof-row"><span>{p.label}</span><b>{p.v[s[p.key]]}</b></div>
            ))}
          </div>
        </>
      )}

      {text && (
        <>
          <h2 className="nb-h">AI가 추천한 공부법</h2>
          <div className="nb-card st-text">{text}</div>
        </>
      )}
    </>
  )
}
