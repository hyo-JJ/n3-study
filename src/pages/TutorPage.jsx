import { useEffect, useRef, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { useActiveLevel } from '../hooks/useActiveLevel'
import { supabase } from '../lib/supabase'

// AI 회화 튜터 — 상황을 고르면 AI가 역할을 맡아 일본어로 대화하고 내 문장을 고쳐 줌
// 예문은 AI Hub 한-일 번역 병렬 말뭉치(데이터는 Supabase corpus 테이블, 서버 함수 tutor)
export const SITUATIONS = [
  { id: 'airport', emoji: '✈️', name: '공항·기내', desc: '체크인, 수하물, 기내 서비스' },
  { id: 'hotel', emoji: '🏨', name: '호텔', desc: '체크인, 객실 문제, 주변 안내' },
  { id: 'restaurant', emoji: '🍜', name: '음식점', desc: '자리 안내, 주문, 계산' },
  { id: 'shopping', emoji: '🛍️', name: '쇼핑', desc: '사이즈·색상, 가격, 면세' },
  { id: 'sightseeing', emoji: '🗾', name: '관광·길 묻기', desc: '명소 추천, 교통, 길 찾기' },
  { id: 'leisure', emoji: '🎬', name: '영화·음악·취미', desc: '친구와 취미 이야기' },
  { id: 'sports', emoji: '⚽', name: '스포츠', desc: '운동, 경기 관람 이야기' },
  { id: 'daily', emoji: '💬', name: '일상 대화', desc: '친구와 반말·구어체로' },
]
// 학습 호흡에 맞춘 한 번의 대화 길이 (내 발화 수)
const TURNS = { 10: 6, 20: 10, 0: 16 }
const LEVELS = ['N5', 'N4', 'N3']
const FIX_WHEN = {
  immediate: '내가 말할 때마다 바로 보여줘요',
  adaptive: '어색할 때만 바로 보여줘요',
  delayed: '대화를 끝낸 뒤 모아서 보여줘요',
}

const ERR = {
  NO_KEY: 'AI 대화는 아직 준비 중이에요 (서버에 API 키가 필요해요). 지금은 예문으로 연습해 보세요.',
  BUSY: '지금 요청이 많아요. 잠시 뒤 다시 보내 주세요.',
  REFUSAL: 'AI가 이 문장에는 답할 수 없대요. 다르게 말해 볼까요?',
}
const errMsg = (code) => ERR[code] ?? '연결이 잘 안 돼요. 잠시 뒤 다시 시도해 주세요.'

// 서버 함수 호출 — 실패 응답 본문(error 코드)까지 읽어서 돌려줌
async function callTutor(body) {
  const { data, error } = await supabase.functions.invoke('tutor', { body })
  if (!error) return data
  try { return await error.context.json() } catch { return { error: 'NETWORK' } }
}

export default function TutorPage() {
  const [situation, setSituation] = useState(null)
  const [tab, setTab] = useState('chat')
  const s = SITUATIONS.find(x => x.id === situation)

  return (
    <div className="screen nb">
      <NbHeader title={s ? `${s.emoji} ${s.name}` : 'AI 회화'} onBack={s ? () => setSituation(null) : undefined} />
      <div className="scroll">
        {!s ? (
          <>
            <p className="nb-p" style={{ marginBottom: 16 }}>
              상황을 고르면 AI가 점원·직원·친구 역할을 맡아 일본어로 말을 걸어요. 일본어로 답하면 자연스러운 표현으로 고쳐 주고, 실제 한-일 대화 데이터에서 비슷한 예문도 찾아 보여줘요.
            </p>
            <div className="tt-grid">
              {SITUATIONS.map(x => (
                <button key={x.id} className="nb-card tt-sit" onClick={() => { setSituation(x.id); setTab('chat') }}>
                  <span className="tt-emoji">{x.emoji}</span>
                  <b>{x.name}</b>
                  <span>{x.desc}</span>
                </button>
              ))}
            </div>
            <p className="nb-p" style={{ fontSize: 12, marginTop: 18 }}>예문 출처: AI Hub 「일상생활 및 구어체 한-일 번역 병렬 말뭉치」</p>
          </>
        ) : (
          <>
            <div className="nb-tabs" style={{ marginBottom: 14 }}>
              <button className={`nb-tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}>AI 대화</button>
              <button className={`nb-tab${tab === 'examples' ? ' on' : ''}`} onClick={() => setTab('examples')}>예문 보기</button>
            </div>
            {tab === 'chat'
              ? <Chat key={situation} situation={situation} onExamples={() => setTab('examples')} />
              : <Examples key={situation} situation={situation} />}
          </>
        )}
      </div>
      {!s && <BottomNav />}
    </div>
  )
}

// 한 번의 대화 — turns: [{ role:'assistant', ja, ko, hint, examples } | { role:'user', text, correction }]
function Chat({ situation, onExamples }) {
  const plan = usePlan()
  const record = useRecord()
  const [activeLevel] = useActiveLevel()
  const [level, setLevel] = useState(LEVELS.includes(activeLevel) ? activeLevel : 'N3')
  const [turns, setTurns] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [showKo, setShowKo] = useState(plan.screen === 'textual') // 목록형은 뜻을 처음부터
  const [hint, setHint] = useState(false)
  const [ended, setEnded] = useState(false)
  const bottom = useRef(null)
  const delayed = plan.feedback === 'delayed'
  const limit = TURNS[plan.chunk] ?? 10
  const said = turns.filter(t => t.role === 'user').length

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [turns, busy, ended])

  const send = async (text) => {
    const next = text ? [...turns, { role: 'user', text }] : turns
    setTurns(next); setInput(''); setBusy(true); setErr(null); setHint(false)
    const res = await callTutor({
      situation, level, feedback: plan.feedback,
      turns: next.map(t => ({ role: t.role, content: t.role === 'user' ? t.text : t.ja })),
    })
    setBusy(false)
    if (res?.error) { setErr(res.error); return }
    setTurns(cur => {
      const out = [...cur]
      // 방금 보낸 내 문장에 첨삭 붙이기
      if (text && res.correction?.needed) out[out.length - 1] = { ...out[out.length - 1], correction: res.correction }
      return [...out, { role: 'assistant', ja: res.reply_ja, ko: res.reply_ko, hint: res.hint, examples: res.examples ?? [] }]
    })
  }

  const start = () => send(null)
  const submit = (e) => { e.preventDefault(); if (input.trim() && !busy) send(input.trim()) }
  const finish = () => { setEnded(true); record() }

  const lastAi = [...turns].reverse().find(t => t.role === 'assistant')
  const corrections = turns.filter(t => t.role === 'user' && t.correction)

  if (!turns.length) {
    return (
      <>
        <div className="nb-card">
          <b>JLPT 수준</b>
          <p className="nb-p" style={{ margin: '4px 0 10px' }}>AI가 이 수준에 맞는 단어로 말해요.</p>
          <div className="nb-tabs" style={{ margin: 0 }}>
            {LEVELS.map(l => <button key={l} className={`nb-tab${level === l ? ' on' : ''}`} onClick={() => setLevel(l)}>{l}</button>)}
          </div>
        </div>
        <div className="nb-card">
          <span className="nb-chip" style={{ '--c': 'var(--nb-sky)' }}>나에게 맞춘 대화</span>
          <p className="nb-p" style={{ marginTop: 8 }}>
            한 번에 내 말 <b>{limit}번</b> 정도 · 첨삭은 {FIX_WHEN[plan.feedback]}
          </p>
        </div>
        {err && <ErrorCard code={err} onExamples={onExamples} />}
        <button className="nb-btn" style={{ marginTop: 16 }} onClick={start} disabled={busy}>{busy ? 'AI가 준비 중…' : '대화 시작하기'}</button>
      </>
    )
  }

  return (
    <>
      <div className="tt-chat">
        {turns.map((t, i) => t.role === 'assistant' ? (
          <div key={i} className="tt-ai">
            <div className="tt-bubble"><span className="jp">{t.ja}</span>{showKo && <small>{t.ko}</small>}</div>
            {t.examples?.length > 0 && i === turns.length - 1 && (
              <details className="tt-ex">
                <summary>📚 데이터셋 예문 {t.examples.length}</summary>
                {t.examples.map(e => <p key={e.id}><span className="jp">{e.ja}</span><small>{e.ko}</small></p>)}
              </details>
            )}
          </div>
        ) : (
          <div key={i} className="tt-me">
            <div className="tt-bubble">{t.text}</div>
            {t.correction && !delayed && <Correction c={t.correction} />}
          </div>
        ))}
        {busy && <div className="tt-ai"><div className="tt-bubble tt-typing">…</div></div>}
      </div>

      {ended ? (
        <div className="nb-card" style={{ marginTop: 16 }}>
          <b>대화 끝! 내 말 {said}번 했어요 👏</b>
          {corrections.length ? (
            <>
              <p className="nb-p" style={{ margin: '6px 0 4px' }}>이렇게 말하면 더 자연스러워요</p>
              {corrections.map((t, i) => (
                <div key={i} className="tt-review"><s>{t.text}</s><Correction c={t.correction} /></div>
              ))}
            </>
          ) : <p className="nb-p" style={{ marginTop: 6 }}>고칠 문장이 하나도 없었어요. 완벽해요!</p>}
        </div>
      ) : (
        <>
          {err && <ErrorCard code={err} onExamples={onExamples} />}
          {said >= limit && <p className="tt-limit">오늘 대화는 이 정도면 충분해요. 마무리해 볼까요?</p>}
          {hint && lastAi?.hint && <p className="tt-hint">💡 {lastAi.hint}</p>}
          <form className="tt-input" onSubmit={submit}>
            <input className="nb-input jp" lang="ja" value={input} onChange={e => setInput(e.target.value)} placeholder="일본어로 답해 보세요 (한국어도 OK)" disabled={busy} />
            <button className="nb-btn sm" disabled={busy || !input.trim()}>보내기</button>
          </form>
          <div className="tt-tools">
            <button className="nb-btn ghost sm" onClick={() => setShowKo(v => !v)}>{showKo ? '뜻 숨기기' : '뜻 보기'}</button>
            <button className="nb-btn ghost sm" onClick={() => setHint(v => !v)} disabled={!lastAi?.hint}>힌트</button>
            <button className="nb-btn ghost sm" onClick={finish}>{delayed ? '끝내고 첨삭 보기' : '대화 끝내기'}</button>
          </div>
        </>
      )}
      <div ref={bottom} />
    </>
  )
}

function Correction({ c }) {
  return (
    <div className="tt-fix">
      <div className="jp">✏️ {c.corrected}</div>
      {c.explanation && <small>{c.explanation}</small>}
    </div>
  )
}

function ErrorCard({ code, onExamples }) {
  return (
    <div className="nb-card tt-err">
      <p className="nb-p">{errMsg(code)}</p>
      <button className="nb-btn sm" style={{ marginTop: 10 }} onClick={onExamples}>예문 보러 가기 →</button>
    </div>
  )
}

// 예문 보기 — 데이터셋에서 상황별 예문을 바로 꺼내 봄 (AI 키 없이도 동작)
// 퀴즈형·카드형은 한국어만 보고 일본어를 떠올려 본 뒤 탭, 목록형은 처음부터 둘 다
function Examples({ situation }) {
  const plan = usePlan()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const recall = plan.screen !== 'textual'

  const load = async (query) => {
    setRows(null); setErr(false); setOpen(new Set())
    const { data, error } = await supabase.rpc('search_corpus', { p_situation: situation, p_query: query || null, p_limit: 10 })
    if (error) { console.error(error); setErr(true); setRows([]); return }
    setRows(data)
  }
  useEffect(() => { load('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <>
      <form className="tt-input" onSubmit={e => { e.preventDefault(); load(q.trim()) }}>
        <input className="nb-input" value={q} onChange={e => setQ(e.target.value)} placeholder="찾고 싶은 표현 (예: 예약, 계산, 화장실)" />
        <button className="nb-btn sm">찾기</button>
      </form>
      {recall && <p className="nb-p" style={{ margin: '10px 2px' }}>한국어를 보고 일본어로 먼저 말해 본 뒤, 탭해서 확인해요.</p>}
      {err ? (
        <div className="nb-empty">예문 데이터가 아직 준비되지 않았어요.<br />(관리자: supabase/tutor_corpus.sql 실행 후 CSV 업로드)</div>
      ) : !rows ? (
        <div className="nb-empty">불러오는 중…</div>
      ) : !rows.length ? (
        <div className="nb-empty">찾는 표현이 없어요. 다른 말로 찾아볼까요?</div>
      ) : (
        <div className="nb-list" style={{ marginTop: 10 }}>
          {rows.map(r => {
            const shown = !recall || open.has(r.id)
            return (
              <button key={r.id} className="nb-card tt-row" onClick={() => toggle(r.id)}>
                <span>{r.ko}</span>
                <b className={`jp${shown ? '' : ' tt-hidden'}`}>{shown ? r.ja : '탭해서 일본어 보기'}</b>
              </button>
            )
          })}
        </div>
      )}
      <button className="nb-btn ghost" style={{ marginTop: 16 }} onClick={() => { setQ(''); load('') }}>🔀 새 예문</button>
    </>
  )
}
