import { useEffect, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { useRecord } from '../hooks/useRecord'
import { supabase } from '../lib/supabase'

// 상황별 회화 문장 맞추기 — AI Hub 한-일 번역 병렬 말뭉치(Supabase corpus 테이블, search_corpus 함수)만 사용
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

export default function TutorPage() {
  const [situation, setSituation] = useState(null)
  const s = SITUATIONS.find(x => x.id === situation)

  return (
    <div className="screen nb">
      <NbHeader title={s ? `${s.emoji} ${s.name}` : '상황별 회화'} onBack={s ? () => setSituation(null) : undefined} />
      <div className="scroll">
        {!s ? (
          <>
            <p className="nb-p" style={{ marginBottom: 16 }}>
              상황을 고르면 실제 한-일 대화 데이터의 문장이 조각조각 흩어져 나와요. 한국어 뜻을 보고 조각을 순서대로 맞춰 일본어 문장을 완성해 보세요.
            </p>
            <div className="tt-grid">
              {SITUATIONS.map(x => (
                <button key={x.id} className="nb-card tt-sit" onClick={() => setSituation(x.id)}>
                  <span className="tt-emoji">{x.emoji}</span>
                  <b>{x.name}</b>
                  <span>{x.desc}</span>
                </button>
              ))}
            </div>
            <p className="nb-p" style={{ fontSize: 12, marginTop: 18 }}>예문 출처: AI Hub 「일상생활 및 구어체 한-일 번역 병렬 말뭉치」</p>
          </>
        ) : <Arrange key={situation} situation={situation} />}
      </div>
      {!s && <BottomNav />}
    </div>
  )
}

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 문장을 조각(대략 어절)으로 나누기 — 단어로 쪼갠 뒤 조사·문장부호에서 끊음
const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'も', 'へ', 'の', 'や', 'か', 'ね', 'よ', 'から', 'まで', 'より', 'けど', 'けれど', 'ので', 'のに', 'って', 'には', 'では', 'とは', 'にも', 'でも', 'ても', 'て'])
const PUNCT = /^[、。！？!?,.・…「」『』（）()〜~ー]+$/
const MAX_PARTS = 8
function toParts(ja) {
  const words = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(ja)].map(x => x.segment)
    : ja.split(/(?<=[、。！？\s])/)
  const parts = []
  let cur = ''
  for (const w of words.map(x => x.trim()).filter(Boolean)) {
    if (PUNCT.test(w)) {
      // 문장부호는 앞 조각에 붙이고 거기서 끊음
      if (cur) { parts.push(cur + w); cur = '' }
      else if (parts.length) parts[parts.length - 1] += w
      continue
    }
    // っ·ん·ゃ 등으로 시작하는 말(활용 어미)은 단어 중간이라 앞에 붙임
    if (!cur && parts.length && /^[っッんゃゅょぁぃぅぇぉー]/.test(w)) { cur = parts.pop() }
    cur += w
    if (PARTICLES.has(w)) { parts.push(cur); cur = '' }
  }
  if (cur) parts.push(cur)
  // 조각이 너무 많으면 가장 짧은 이웃끼리 합치기
  while (parts.length > MAX_PARTS) {
    let best = 0
    for (let i = 1; i < parts.length - 1; i++) if (parts[i].length + parts[i + 1].length < parts[best].length + parts[best + 1].length) best = i
    parts.splice(best, 2, parts[best] + parts[best + 1])
  }
  return parts
}
const deal = (parts) => {
  const pool = parts.map((t, k) => ({ k, t }))
  let mixed = shuffle(pool)
  for (let n = 0; n < 5 && mixed.map(x => x.t).join('') === parts.join(''); n++) mixed = shuffle(pool)
  return mixed
}

// 문장 맞추기 게임 — 한국어를 보고 흩어진 일본어 조각을 순서대로 탭해서 문장 완성
function Arrange({ situation }) {
  const record = useRecord()
  const [q, setQ] = useState('')
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(false)
  const [i, setI] = useState(0)
  const [pool, setPool] = useState([])
  const [picked, setPicked] = useState([]) // pool 안의 위치
  const [result, setResult] = useState(null) // null | 'ok' | 'no'
  const [score, setScore] = useState(0)

  const start = (list, n) => { setI(n); setPool(list[n] ? deal(list[n].parts) : []); setPicked([]); setResult(null) }
  const load = async (query) => {
    setItems(null); setErr(false); setScore(0)
    const { data, error } = await supabase.rpc('search_corpus', { p_situation: situation, p_query: query || null, p_limit: 20 })
    if (error) { console.error(error); setErr(true); setItems([]); return }
    const list = data.map(r => ({ ...r, parts: toParts(r.ja) })).filter(r => r.parts.length >= 3 && r.ja.length <= 45).slice(0, 10)
    setItems(list)
    start(list, 0)
  }
  useEffect(() => { load('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const item = items?.[i]
  const answer = picked.map(p => pool[p].t)
  const check = (next) => {
    const ok = next.map(p => pool[p].t).join('') === item.parts.join('')
    setResult(ok ? 'ok' : 'no')
    if (ok) setScore(s => s + 1)
  }
  const pick = (p) => {
    if (result || picked.includes(p)) return
    const next = [...picked, p]
    setPicked(next)
    if (next.length === pool.length) check(next)
  }
  const unpick = (p) => { if (!result) setPicked(picked.filter(x => x !== p)) }
  const giveUp = () => setResult('no')
  const next = () => {
    if (i + 1 >= items.length) record({ kind: 'talk', label: '상황별 회화 문장 맞추기', correct: score, total: items.length })
    start(items, i + 1)
  }

  const search = (
    <form className="tt-input" onSubmit={e => { e.preventDefault(); load(q.trim()) }}>
      <input className="nb-input" value={q} onChange={e => setQ(e.target.value)} placeholder="연습하고 싶은 표현 (예: 예약, 계산, 화장실)" />
      <button className="nb-btn sm">찾기</button>
    </form>
  )

  if (err) return <>{search}<div className="nb-empty">예문 데이터가 아직 준비되지 않았어요.<br />(관리자: supabase/tutor_corpus.sql 실행 후 CSV 업로드)</div></>
  if (!items) return <>{search}<div className="nb-empty">문장을 섞는 중…</div></>
  if (!items.length) return <>{search}<div className="nb-empty">맞출 문장이 없어요. 다른 말로 찾아볼까요?</div></>

  if (!item) {
    const pct = score / items.length
    return (
      <>
        <div className="nb-card nb-q" style={{ marginTop: 16 }}>
          <div className="big">{score} / {items.length}</div>
          <div className="hint">{pct >= .8 ? '문장 감각이 좋아요! 🎉' : pct >= .5 ? '좋아요, 조사 위치만 조금 더! 💪' : '한국어 뜻을 떠올리며 한 번 더 해봐요 📖'}</div>
        </div>
        <button className="nb-btn" style={{ marginTop: 16 }} onClick={() => { setQ(''); load('') }}>🔀 새 문장으로 다시</button>
      </>
    )
  }

  return (
    <>
      {search}
      <div className="nb-hud" style={{ marginTop: 14 }}><span>{i + 1} / {items.length}</span><span>맞힌 문장 {score}</span></div>
      <div className="nb-card">
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, wordBreak: 'keep-all' }}>{item.ko}</div>
        <div className={`sc-ans${result ? ` ${result}` : ''}`}>
          {answer.length
            ? picked.map(p => <button key={p} className="sc-chip" onClick={() => unpick(p)}>{pool[p].t}</button>)
            : <span className="sc-ph">아래 조각을 순서대로 탭하세요</span>}
        </div>
        {result && (
          <div style={{ marginTop: 12 }}>
            <b style={{ color: result === 'ok' ? 'var(--nb-ok)' : 'var(--nb-err)' }}>{result === 'ok' ? '정답! 🎉' : '아쉬워요 — 정답은'}</b>
            {result === 'no' && <div className="jp" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{item.ja}</div>}
          </div>
        )}
      </div>
      {!result && (
        <div className="sc-pool">
          {pool.map((x, p) => <button key={p} className={`sc-chip${picked.includes(p) ? ' used' : ''}`} onClick={() => pick(p)}>{x.t}</button>)}
        </div>
      )}
      <div className="gap" />
      {result
        ? <button className="nb-btn" onClick={next}>{i + 1 >= items.length ? '결과 보기' : '다음 문장 →'}</button>
        : <div style={{ display: 'flex', gap: 10 }}>
            <button className="nb-btn ghost" style={{ flex: 1 }} onClick={() => setPicked([])} disabled={!picked.length}>다시 놓기</button>
            <button className="nb-btn ghost" style={{ flex: 1 }} onClick={giveUp}>정답 보기</button>
          </div>}
    </>
  )
}
