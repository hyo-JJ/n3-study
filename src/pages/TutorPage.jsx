import { useEffect, useRef, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { supabase } from '../lib/supabase'

// 상황별 회화 예문 — AI Hub 한-일 번역 병렬 말뭉치(Supabase corpus 테이블, search_corpus 함수)만 사용
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
              상황을 고르면 실제 한-일 대화 데이터에서 그 상황에 쓰는 문장을 꺼내 보여줘요. 한국어를 보고 일본어로 먼저 말해 본 뒤 확인해 보세요.
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
        ) : <Examples key={situation} situation={situation} />}
      </div>
      {!s && <BottomNav />}
    </div>
  )
}

// 예문 보기 — 데이터셋에서 상황별 예문을 바로 꺼내 봄
// 퀴즈형·카드형은 한국어만 보고 일본어를 떠올려 본 뒤 탭, 목록형은 처음부터 둘 다
function Examples({ situation }) {
  const plan = usePlan()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const record = useRecord()
  const done = useRef(false) // 이번 예문 묶음을 학습 기록에 남겼는지
  const recall = plan.screen !== 'textual'

  const load = async (query) => {
    setRows(null); setErr(false); setOpen(new Set()); done.current = false
    const { data, error } = await supabase.rpc('search_corpus', { p_situation: situation, p_query: query || null, p_limit: 10 })
    if (error) { console.error(error); setErr(true); setRows([]); return }
    setRows(data)
  }
  useEffect(() => { load('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  // 한 묶음을 다 확인하면(목록형은 다 본 뒤 새 예문을 누르면) 오늘 학습 1회로 기록
  useEffect(() => {
    if (recall && rows?.length && !done.current && rows.every(r => open.has(r.id))) { done.current = true; record() }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const more = () => {
    if (!recall && rows?.length && !done.current) record()
    setQ(''); load('')
  }

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
      <button className="nb-btn ghost" style={{ marginTop: 16 }} onClick={more}>🔀 새 예문</button>
    </>
  )
}
