import { useEffect, useRef, useState } from 'react'

// 획순 데이터: KanjiVG (https://kanjivg.tagaini.net, CC BY-SA 3.0)
const KVG_URL = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/'
const SIZE = 109 // KanjiVG viewBox 크기
const STEP = 0.55 // 한 획 애니메이션 시간(초)
const cache = new Map()

function loadStrokes(ch) {
  if (!cache.has(ch)) {
    const code = ch.codePointAt(0).toString(16).padStart(5, '0')
    const p = fetch(`${KVG_URL}${code}.svg`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text() })
      .then(txt => {
        const doc = new DOMParser().parseFromString(txt, 'image/svg+xml')
        const strokes = [...doc.querySelectorAll('path[id*="-s"]')]
          .map(el => ({ n: Number(el.id.split('-s').pop()), d: el.getAttribute('d') }))
          .sort((a, b) => a.n - b.n)
          .map(s => s.d)
        const nums = [...doc.querySelectorAll('text')].map(t => {
          const m = t.getAttribute('transform')?.match(/([\d.]+)\s+([\d.]+)\)\s*$/)
          return m ? { x: Number(m[1]), y: Number(m[2]), n: t.textContent } : null
        }).filter(Boolean)
        return { strokes, nums }
      })
    p.catch(() => cache.delete(ch))
    cache.set(ch, p)
  }
  return cache.get(ch)
}

// 단어가 바뀌면 부모에서 key를 바꿔 상태를 초기화한다
export default function WritePad({ word }) {
  const chars = [...word]
  const [sel, setSel] = useState(0)
  const [data, setData] = useState(null) // { strokes, nums } | 'error'
  const [guide, setGuide] = useState(true)
  const [animKey, setAnimKey] = useState(0)
  const [lines, setLines] = useState([]) // 사용자가 그린 획들 (0~1 좌표)
  const canvasRef = useRef(null)
  const drawing = useRef(null)
  const ch = chars[sel]

  useEffect(() => {
    let alive = true
    setData(null); setLines([]); setAnimKey(0)
    loadStrokes(ch).then(d => alive && setData(d), () => alive && setData('error'))
    return () => { alive = false }
  }, [ch])

  const redraw = (all, extra) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const w = cv.width
    ctx.clearRect(0, 0, w, w)
    ctx.strokeStyle = getComputedStyle(cv).color
    ctx.lineWidth = w / SIZE * 4
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (const pts of extra ? [...all, extra] : all) {
      ctx.beginPath()
      pts.forEach(([x, y], i) => i ? ctx.lineTo(x * w, y * w) : ctx.moveTo(x * w, y * w))
      if (pts.length === 1) ctx.lineTo(pts[0][0] * w + 0.1, pts[0][1] * w)
      ctx.stroke()
    }
  }

  useEffect(() => {
    const cv = canvasRef.current
    const ro = new ResizeObserver(() => {
      const px = Math.round(cv.clientWidth * (window.devicePixelRatio || 1))
      if (cv.width !== px) { cv.width = px; cv.height = px }
      redraw(lines)
    })
    ro.observe(cv)
    return () => ro.disconnect()
  }, [lines])

  useEffect(() => { redraw(lines) }, [lines])

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
  }
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = [pos(e)]
    redraw(lines, drawing.current)
  }
  const onMove = (e) => {
    if (!drawing.current) return
    drawing.current.push(pos(e))
    redraw(lines, drawing.current)
  }
  const onUp = () => {
    if (!drawing.current) return
    const pts = drawing.current
    drawing.current = null
    setLines(ls => [...ls, pts])
  }

  const strokes = data && data !== 'error' ? data.strokes : []

  return (
    <div className="wp">
      {chars.length > 1 && (
        <div className="wp-chars">
          {chars.map((c, i) => (
            <button key={i} className={`wp-char jp${i === sel ? ' active' : ''}`} onClick={() => setSel(i)}>{c}</button>
          ))}
        </div>
      )}

      <div className="wp-board">
        <svg className="wp-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <line className="wp-grid" x1={SIZE / 2} y1="0" x2={SIZE / 2} y2={SIZE} />
          <line className="wp-grid" x1="0" y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} />
          {data === 'error' && guide && (
            <text className="wp-fallback jp" x={SIZE / 2} y={SIZE / 2} textAnchor="middle" dominantBaseline="central">{ch}</text>
          )}
          {guide && strokes.map((d, i) => <path key={i} className="wp-tpl" d={d} />)}
          {guide && data?.nums?.map((t, i) => <text key={i} className="wp-num" x={t.x} y={t.y}>{t.n}</text>)}
          {animKey > 0 && (
            <g key={animKey}>
              {strokes.map((d, i) => (
                <path key={i} className="wp-anim" d={d} pathLength="1" style={{ animationDelay: `${i * STEP}s`, animationDuration: `${STEP}s` }} />
              ))}
            </g>
          )}
        </svg>
        <canvas
          ref={canvasRef}
          className="wp-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {!data && <div className="wp-loading">불러오는 중...</div>}
      </div>

      <div className="wp-tools">
        <button className="wp-btn primary" onClick={() => setAnimKey(k => k + 1)} disabled={!strokes.length}>▶ 획순 보기</button>
        <button className="wp-btn" onClick={() => setGuide(g => !g)}>{guide ? '가이드 끄기' : '가이드 켜기'}</button>
        <button className="wp-btn" onClick={() => setLines(ls => ls.slice(0, -1))} disabled={!lines.length}>되돌리기</button>
        <button className="wp-btn" onClick={() => setLines([])} disabled={!lines.length}>지우기</button>
      </div>
      <div className="wp-info">
        {strokes.length ? `${strokes.length}획 · ` : ''}획순 데이터: KanjiVG (CC BY-SA 3.0)
      </div>
    </div>
  )
}
