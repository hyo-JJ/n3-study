import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProgress, today } from '../hooks/useProgress'
import { LEVELS } from '../lib/data'

const REPS = 5 // 단어마다 쓰는 횟수

// 오답노트에는 읽는 법이 없어서 단어 데이터에서 찾아 채운다
const withReading = (w) => {
  if (w.reading || !w.level) return w
  const found = LEVELS[w.level]?.days[w.dn - 1]?.words.find(x => x.no === w.no)
  return { ...w, reading: found?.reading }
}

// "早い/速い"처럼 표기가 여러 개면 첫 번째만 칸에 쓴다
const chars = (word) => Array.from(word.split('/')[0])

function Rep({ word, trace }) {
  return (
    <span className="ws-rep">
      {chars(word).map((c, i) => <span key={i} className="ws-cell">{trace ? c : ''}</span>)}
    </span>
  )
}

// 틀린 단어를 5번씩 써 보는 연습지 — 인쇄하거나 PDF로 저장해 굿노트에서 쓰기
export default function PrintPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { getLevel } = useProgress()
  const [showReading, setShowReading] = useState(true)
  const [showTrace, setShowTrace] = useState(true)

  // 넘겨받은 단어가 없으면 모든 레벨의 오답노트
  const words = useMemo(() => {
    const src = state?.words ?? Object.keys(LEVELS).flatMap(lv => getLevel(lv).wrongWords.map(w => ({ ...w, level: lv })))
    return src.map(withReading)
  }, [state, getLevel])
  const title = state?.title ?? '오답노트'

  return (
    <div className="ws-page">
      <div className="ws-bar no-print">
        <button className="nb-ibtn" onClick={() => navigate(-1)} aria-label="뒤로">←</button>
        <div className="grow">
          <b>쓰기 연습지</b>
          <div className="s">{words.length}단어 · 단어마다 {REPS}번씩</div>
        </div>
        <button className="nb-btn" style={{ width: 'auto', padding: '10px 16px' }} disabled={!words.length} onClick={() => window.print()}>PDF / 인쇄</button>
      </div>

      <div className="ws-opts no-print">
        <label><input type="checkbox" checked={showReading} onChange={e => setShowReading(e.target.checked)} /> 요미카타 표시</label>
        <label><input type="checkbox" checked={showTrace} onChange={e => setShowTrace(e.target.checked)} /> 따라쓰기 칸 넣기</label>
        <p>아이폰·아이패드: <b>PDF / 인쇄</b> → 오른쪽 위 공유 버튼 → <b>GoodNotes</b>(또는 '파일에 저장')를 고르면 PDF로 들어가요.<br />
          맥: 인쇄 창 왼쪽 아래 <b>PDF → PDF로 저장</b>.</p>
      </div>

      {words.length === 0 ? (
        <div className="nb-empty no-print">틀린 단어가 없어요 🎉</div>
      ) : (
        <div className="ws-sheet">
          <div className="ws-head">
            <div>
              <div className="ws-title">✍️ 단어 쓰기 연습 — {title}</div>
              <div className="ws-sub">{today()} · {words.length}단어 · 한 단어를 {REPS}번씩 써요</div>
            </div>
            <div className="ws-name">이름 ____________</div>
          </div>
          {words.map((w, i) => (
            <div key={`${w.level}-${w.dn}-${w.no}-${i}`} className="ws-word">
              <div className="ws-info">
                <span className="ws-no">{i + 1}</span>
                <span className="ws-jp">{w.word}</span>
                {showReading && w.reading && <span className="ws-rd">{w.reading}</span>}
                <span className="ws-mean">{w.meaning}</span>
              </div>
              <div className="ws-grid">
                {showTrace && <Rep word={w.word} trace />}
                {Array.from({ length: REPS }, (_, k) => <Rep key={k} word={w.word} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
