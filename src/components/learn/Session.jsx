import { useMemo, useRef, useState } from 'react'
import Furigana from '../Furigana'
import WritePad from '../WritePad'

// 익히기 화면 공통 부품 — N3~N5 단어, 오답노트, 상용한자가 같이 씀
// item: { key, word, reading?, meaning, detail?(뒷면에 더 보여줄 내용), writable?(쓰기 연습 가능) }
//
// LearnSession props
//   screen: 'visual'(카드) | 'textual'(목록) | 'pragmatic'(퀴즈)
//   chunk: 한 세트 개수 (0이면 끊지 않음), start: 이어서 시작할 위치
//   onProgress(n): 앞에서부터 n개를 봤음, onFinish(): 다 봤음, onStop(): 세트 사이에서 그만두기
//   grade(item, ok): 있으면 스스로 채점 모드 (오답노트 — 알았어요/아직 모름)
//   feedback: 퀴즈 피드백 방식 'immediate' | 'adaptive' | 'delayed'
//   recall: 카드에서 뜻을 먼저 떠올려 보도록 안내
//   pool: 퀴즈 오답 보기로 쓸 뜻 목록 (items가 적을 때)
//   save: { isSaved(item), toggle(item) } 있으면 카드·목록에 '단어장에 담기' 버튼 (useMyWords)
export default function LearnSession(props) {
  if (props.screen === 'textual') return <ListSession {...props} />
  if (props.screen === 'pragmatic') return <QuizSession {...props} />
  return <CardSession {...props} />
}

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i)
const setLabel = (i, total, chunk) => chunk && total > chunk ? ` · ${Math.floor(i / chunk) + 1}/${Math.ceil(total / chunk)}세트` : ''

function Meta({ cnt, badge, pct }) {
  return (
    <>
      <div className="fc-meta">
        <span className="fc-cnt">{cnt}</span>
        {badge && <span className="phase-badge">{badge}</span>}
      </div>
      <div className="prog"><div className="prog-fill" style={{ width: `${Math.min(100, pct * 100).toFixed(0)}%` }} /></div>
    </>
  )
}

// 세트 사이 쉬는 화면
export function BreakCard({ done, total, chunk, onContinue, onStop }) {
  const left = Math.min(chunk, total - done)
  return (
    <>
      <div className="result-card">
        <div className="r-score" style={{ fontSize: 52 }}>☕</div>
        <div className="r-msg">한 세트 끝! 잘하고 있어요</div>
        <div className="r-sub">{done} / {total} · 남은 {total - done}개</div>
      </div>
      <button className="btn btn-accent" style={{ marginBottom: 10 }} onClick={onContinue}>다음 {left}개 이어서 →</button>
      <button className="btn btn-outline" onClick={onStop}>여기까지 하고 쉬기 (저장됨)</button>
    </>
  )
}

// 모아서 확인(delayed) 방식에서 틀린 문제를 한꺼번에 보여주기
export function MissList({ misses, title = '틀린 문제 확인' }) {
  if (!misses.length) return null
  return (
    <div className="miss">
      <div className="miss-h">{title} · {misses.length}개</div>
      {misses.map((m, i) => (
        <div key={i} className="miss-row">
          <div className="jp miss-q">{m.q}</div>
          <div className="miss-a">정답 <b>{m.a}</b>{m.picked != null && <span> · 내 답 <s>{m.picked || '(빈칸)'}</s></span>}</div>
        </div>
      ))}
    </div>
  )
}

// 카드형: 한 장씩 크게, 탭하면 뜻
function CardSession({ items, start = 0, chunk = 0, badge, onProgress, onFinish, onStop, grade, recall, save }) {
  const total = items.length
  const [idx, setIdx] = useState(start)
  const [flipped, setFlipped] = useState(false)
  const [paused, setPaused] = useState(false)
  // 쓰기 연습을 펼쳐 둔 사람은 다음 카드에서도 계속 펼쳐지도록 기억
  const [writing, setWriting] = useState(() => { try { return localStorage.getItem('fc-writing') === '1' } catch { return false } })
  const toggleWriting = () => {
    setWriting(w => { try { localStorage.setItem('fc-writing', w ? '0' : '1') } catch {} return !w })
  }

  const item = items[idx]
  const advance = () => {
    const n = idx + 1
    onProgress?.(n)
    if (n >= total) { onFinish(); return }
    setIdx(n)
    setFlipped(false)
    if (chunk && n % chunk === 0) setPaused(true)
  }
  const next = () => flipped ? advance() : setFlipped(true)
  const prev = () => { if (idx > 0) { setIdx(idx - 1); setFlipped(false) } }
  const graded = (ok) => { grade(item, ok); advance() }

  return (
    <>
      <Meta cnt={`${idx + 1} / ${total}${setLabel(idx, total, chunk)}`} badge={badge} pct={(idx + 1) / total} />
      {paused ? (
        <BreakCard done={idx} total={total} chunk={chunk} onContinue={() => setPaused(false)} onStop={onStop} />
      ) : (
        <>
          <div className={`flashcard${flipped ? ' flipped' : ''}${flipped && (writing || item.detail) ? ' compact' : ''}`} onClick={() => setFlipped(true)}>
            <div className="fc-word jp"><Furigana word={item.word} reading={item.reading} show={flipped} /></div>
            {flipped && <div className="fc-meaning">{item.meaning}</div>}
            {!flipped && <div className="fc-tap">{recall ? '뜻을 먼저 떠올려 본 뒤 탭해서 확인' : '탭해서 뜻 확인'}</div>}
          </div>

          {flipped && item.detail && <div className="fc-detail">{item.detail}</div>}

          {flipped && (item.writable || save) && (
            <div className="fc-actions">
              {save && <button className={`fc-save${save.isSaved(item) ? ' on' : ''}`} onClick={() => save.toggle(item)}>{save.isSaved(item) ? '★ 단어장에 담김' : '☆ 단어장에 담기'}</button>}
              {item.writable && <button className={`fc-save${writing ? ' on' : ''}`} onClick={toggleWriting}>{writing ? '✍️ 쓰기 접기' : '✍️ 쓰기 연습'}</button>}
            </div>
          )}
          {flipped && item.writable && writing && (
            <div className="wp-reveal">
              <WritePad key={item.key} word={item.word} />
            </div>
          )}

          <div className="gap" />
          {!flipped ? (
            <button className="btn btn-accent" onClick={next}>뒤집기</button>
          ) : grade ? (
            <div className="btn-row">
              <button className="btn btn-err" onClick={() => graded(false)}>❌ 아직 모름</button>
              <button className="btn btn-ok" onClick={() => graded(true)}>✅ 알았어요</button>
            </div>
          ) : (
            <div className="btn-row">
              <button className="btn btn-muted" onClick={prev}>← 이전</button>
              <button className="btn btn-accent" onClick={next}>다음 →</button>
            </div>
          )}
        </>
      )}
    </>
  )
}

// 목록형: 한 화면에 쭉 (세트 크기가 있으면 세트별로)
function ListSession({ items, start = 0, chunk = 0, badge, onProgress, onFinish, onStop, grade, finishLabel, save }) {
  const total = items.length
  const size = chunk || total
  const [page, setPage] = useState(Math.floor(start / size))
  const [paused, setPaused] = useState(false)
  const [hide, setHide] = useState(false) // 읽는 법·뜻 가리고 스스로 확인
  const [shown, setShown] = useState(() => new Set())
  const [known, setKnown] = useState(() => new Set()) // 채점 모드에서 "외웠어요" 누른 것

  const from = page * size
  const to = Math.min(from + size, total)
  const list = items.slice(from, to)
  const pages = Math.ceil(total / size)

  const toggleHide = () => { setHide(h => !h); setShown(new Set()) }
  const reveal = (k) => setShown(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const markKnown = (it) => { grade(it, true); setKnown(s => new Set(s).add(it.key)) }

  const done = () => {
    onProgress?.(to)
    if (to >= total) { onFinish(); return }
    setPage(p => p + 1)
    setShown(new Set())
    setPaused(true)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <Meta cnt={`${from + 1}~${to} / ${total}${pages > 1 ? ` · ${page + 1}/${pages}세트` : ''}`} badge={badge} pct={to / total} />
      {paused ? (
        <BreakCard done={from} total={total} chunk={size} onContinue={() => setPaused(false)} onStop={onStop} />
      ) : (
        <>
          <div className="ll-bar">
            <span>{hide ? '탭하면 읽는 법·뜻이 보여요' : '쭉 읽으며 눈에 익혀요'}</span>
            <button className={`fc-save${hide ? ' on' : ''}`} onClick={toggleHide}>{hide ? '🙈 가리기 끄기' : '🙈 뜻 가리기'}</button>
          </div>

          <div className="ll-list">
            {list.map((it, i) => {
              const open = !hide || shown.has(it.key)
              const ok = known.has(it.key)
              return (
                <div key={it.key} className={`ll-row${open ? '' : ' hidden'}${ok ? ' known' : ''}`} onClick={() => hide && reveal(it.key)}>
                  <span className="ll-no">{from + i + 1}</span>
                  <div className="ll-main">
                    <div className="ll-word jp"><Furigana word={it.word} reading={it.reading} show={open} /></div>
                    <div className="ll-mean">{open ? it.meaning : '탭해서 확인'}</div>
                    {open && it.detail && <div className="ll-detail">{it.detail}</div>}
                  </div>
                  {save && (
                    <button className={`ll-star${save.isSaved(it) ? ' on' : ''}`} aria-label="단어장에 담기"
                      onClick={(e) => { e.stopPropagation(); save.toggle(it) }}>{save.isSaved(it) ? '★' : '☆'}</button>
                  )}
                  {grade && (
                    <button className={`ll-ok${ok ? ' on' : ''}`} disabled={ok} aria-label="외웠어요"
                      onClick={(e) => { e.stopPropagation(); markKnown(it) }}>{ok ? '✓' : '외웠어요'}</button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="gap" />
          {page > 0 && (
            <button className="btn btn-muted" style={{ marginBottom: 10 }} onClick={() => { setPage(p => p - 1); setShown(new Set()) }}>← 이전 세트</button>
          )}
          <button className="btn btn-accent" onClick={done}>
            {to >= total ? (finishLabel || '다 봤어요 ✓') : `이 ${list.length}개 다 봤어요 ✓`}
          </button>
        </>
      )}
    </>
  )
}

// 퀴즈형: 설명 없이 바로 "뜻은?" 4지선다
// 피드백 — immediate: 매번 정답 공개 / adaptive: 맞히면 바로 다음, 틀리면 공개 / delayed: 세트 끝에 틀린 것만 모아서
// grade가 없으면(처음 익히는 단어) 틀린 것만 끝에 한 번 더
function QuizSession({ items, start = 0, chunk = 0, badge, onProgress, onFinish, onStop, grade, feedback = 'immediate', pool }) {
  const total = items.length
  const [queue, setQueue] = useState(() => range(start, total))
  const [pos, setPos] = useState(0)
  const [retry, setRetry] = useState(false)
  const [wrong, setWrong] = useState([])
  const [picked, setPicked] = useState(null)
  const [pause, setPause] = useState(null) // 'break' | 'retry' | 'misses'
  const [misses, setMisses] = useState([]) // delayed: 아직 안 보여준 틀린 문제
  const after = useRef(null) // misses를 보여준 뒤 이어서 할 일
  const timer = useRef(null)

  const wi = queue[pos]
  const item = items[wi]
  const meanings = pool ?? items.map(x => x.meaning)

  const opts = useMemo(() => {
    const others = [...new Set(shuffle(meanings))].filter(m => m !== item.meaning).slice(0, 3)
    return shuffle([item.meaning, ...others])
  }, [wi, retry]) // eslint-disable-line react-hooks/exhaustive-deps

  const delayed = feedback === 'delayed'
  const answered = picked !== null && !delayed
  const ok = picked === item.meaning

  // 다음으로 — 세트 끝·한 바퀴 끝에서 쉬기/틀린 것 모아 보기/다시 풀기
  const go = (wrongNow, missesNow) => {
    setPicked(null)
    if (!retry) onProgress?.(wi + 1)
    const showMisses = (then) => {
      if (delayed && missesNow.length) { after.current = then; setPause('misses') } else then()
    }
    if (pos + 1 < queue.length) {
      const brk = !retry && chunk && (wi + 1) % chunk === 0
      if (brk) showMisses(() => { setPos(pos + 1); setPause('break') })
      else setPos(pos + 1)
      return
    }
    if (!retry && !grade && wrongNow.length) {
      showMisses(() => { setQueue(shuffle(wrongNow)); setPos(0); setRetry(true); setPause('retry') })
      return
    }
    showMisses(() => { setPause(null); onFinish() })
  }

  const answer = (opt) => {
    if (picked !== null) return
    const right = opt === item.meaning
    setPicked(opt)
    grade?.(item, right)
    const wrongNow = !right && !retry && !wrong.includes(wi) ? [...wrong, wi] : wrong
    if (wrongNow !== wrong) setWrong(wrongNow)
    if (delayed) {
      const missesNow = right ? misses : [...misses, { q: item.word, a: item.meaning, picked: opt }]
      setMisses(missesNow)
      go(wrongNow, missesNow)
    } else if (right && feedback === 'adaptive') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => go(wrongNow, misses), 650)
    }
  }

  const n = retry ? `다시 ${pos + 1} / ${queue.length}` : `${wi + 1} / ${total}${setLabel(wi, total, chunk)}`
  const pct = retry ? (pos + 1) / queue.length : (wi + 1) / total

  return (
    <>
      <Meta cnt={n} badge={retry ? '틀린 것 다시' : badge} pct={pct} />
      {pause === 'misses' ? (
        <>
          <MissList misses={misses} />
          <button className="btn btn-accent" onClick={() => { setMisses([]); after.current?.() }}>확인했어요 →</button>
        </>
      ) : pause === 'break' ? (
        <BreakCard done={wi} total={total} chunk={chunk} onContinue={() => setPause(null)} onStop={onStop} />
      ) : pause === 'retry' ? (
        <>
          <div className="result-card">
            <div className="r-score" style={{ fontSize: 52 }}>🎯</div>
            <div className="r-msg">한 바퀴 끝! 틀린 {queue.length}개만 다시 풀어요</div>
            <div className="r-sub">맞힐 때까지가 아니라 딱 한 번만 더 볼게요</div>
          </div>
          <button className="btn btn-accent" onClick={() => setPause(null)}>다시 풀기 →</button>
        </>
      ) : (
        <>
          <div className="quiz-q">
            <div className="quiz-word jp" style={{ fontSize: item.word.length > 5 ? 34 : undefined, wordBreak: 'keep-all' }}>
              <Furigana word={item.word} reading={item.reading} show={answered} />
            </div>
            <div className="quiz-hint">{answered ? (ok ? '정답! 👏' : `정답은 「${item.meaning}」`) : '이 뜻은?'}</div>
          </div>

          <div className="opts">
            {opts.map(opt => {
              let cls = 'opt'
              if (answered) cls += opt === item.meaning ? ' correct' : opt === picked ? ' wrong' : ' reveal'
              return <button key={opt} className={cls} onClick={() => answer(opt)}>{opt}</button>
            })}
          </div>

          {answered && item.detail && <div className="fc-detail" style={{ marginTop: 12 }}>{item.detail}</div>}

          <div className="gap" />
          {answered && !(ok && feedback === 'adaptive') && <button className="btn btn-accent" onClick={() => go(wrong, misses)}>다음 →</button>}
        </>
      )}
    </>
  )
}
