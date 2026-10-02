import { useState } from 'react'
import { Topbar } from '../../components/Layout'
import { useLearnStep, BreakCard } from '../../hooks/useLearnStep'
import { CHUNK } from '../../lib/studyStyle'
import Furigana from '../../components/Furigana'

// 목록형: 단어·읽는 법·뜻을 한 화면에 쭉 (마이크로형은 10단어씩 끊어서)
export default function ListLearn({ level, dayNum, dayData }) {
  const words = dayData.words
  const total = words.length
  const step = useLearnStep(level, dayNum, total)
  const size = step.micro ? CHUNK : total
  const [page, setPage] = useState(Math.floor(step.start / size))
  const [paused, setPaused] = useState(false)
  const [hide, setHide] = useState(false) // 읽는 법·뜻 가리고 스스로 확인
  const [shown, setShown] = useState(() => new Set())

  const from = page * size
  const to = Math.min(from + size, total)
  const list = words.slice(from, to)
  const pages = Math.ceil(total / size)

  const toggleHide = () => { setHide(h => !h); setShown(new Set()) }
  const reveal = (i) => setShown(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  const done = () => {
    step.saveProgress(to)
    if (to >= total) { step.finish(); return }
    setPage(p => p + 1)
    setShown(new Set())
    setPaused(true)
    window.scrollTo(0, 0)
  }

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} · ${dayData.topic}`} onBack={step.exit} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{from + 1}~{to} / {total}{pages > 1 && ` · ${page + 1}/${pages}세트`}</span>
          <span className="phase-badge">① 단어 목록</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${(to / total * 100).toFixed(0)}%` }} /></div>

        {paused ? (
          <BreakCard done={from} total={total} onContinue={() => setPaused(false)} onStop={step.stop} />
        ) : (
          <>
            <div className="ll-bar">
              <span>{hide ? '탭하면 읽는 법·뜻이 보여요' : '쭉 읽으며 눈에 익혀요'}</span>
              <button className={`fc-save${hide ? ' on' : ''}`} onClick={toggleHide}>{hide ? '🙈 가리기 끄기' : '🙈 뜻 가리기'}</button>
            </div>

            <div className="ll-list">
              {list.map((w, i) => {
                const n = from + i
                const open = !hide || shown.has(n)
                return (
                  <div key={n} className={`ll-row${open ? '' : ' hidden'}`} onClick={() => hide && reveal(n)}>
                    <span className="ll-no">{n + 1}</span>
                    <div className="ll-main">
                      <div className="ll-word jp"><Furigana word={w.word} reading={w.reading} show={open} /></div>
                      <div className="ll-mean">{open ? w.meaning : '탭해서 확인'}</div>
                    </div>
                    <button className="ll-star" aria-label="단어장에 담기"
                      onClick={(e) => { e.stopPropagation(); step.toggleSave(w) }}>
                      {step.isSaved(w) ? '★' : '☆'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="gap" />
            {page > 0 && (
              <button className="btn btn-muted" style={{ marginBottom: 10 }} onClick={() => { setPage(p => p - 1); setShown(new Set()) }}>← 이전 세트</button>
            )}
            <button className="btn btn-accent" onClick={done}>
              {to >= total ? (step.reviewOnly ? '복습 끝 ✓' : '다 외웠어요 → 백지 복습') : `이 ${list.length}단어 다 봤어요 ✓`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
