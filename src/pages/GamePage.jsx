import { useEffect, useMemo, useRef, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { learnedWords } from '../lib/study'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const MIN_WORDS = 8

const GAMES = [
  { id: 'speed', name: '스피드 퀴즈', desc: '60초 동안 뜻을 최대한 많이 맞히기', c: 'var(--nb-pink)', unit: '개', better: 'high' },
  { id: 'match', name: '짝 맞추기', desc: '단어와 뜻 6쌍을 빨리 짝지어요', c: 'var(--nb-sky)', unit: '초', better: 'low' },
  { id: 'reading', name: '요미카타 퀴즈', desc: '한자를 보고 읽는 법 고르기 (10문제)', c: 'var(--nb-lime)', unit: '점', better: 'high' },
]

// 틀린 단어는 오답노트로 (앱 단어일 때만)
function useAddWrong() {
  const { update } = useProgress()
  return (w) => {
    if (!w.level || !w.dn) return
    update(w.level, st => st.wrongWords.some(x => x.dn === w.dn && x.no === w.no) ? st
      : { ...st, wrongWords: [...st.wrongWords, { dn: w.dn, no: w.no, word: w.word, meaning: w.meaning }] })
  }
}

function useBest(id, better) {
  const { my, updateMy } = useProgress()
  const best = my.best?.[id]
  const record = (v) => {
    const isNew = best == null || (better === 'high' ? v > best : v < best)
    if (isNew) updateMy(m => ({ ...m, best: { ...m.best, [id]: v } }))
    return isNew
  }
  return [best, record]
}

function Result({ game, value, isNew, onAgain, onExit }) {
  return (
    <>
      <div className="nb-card nb-q">
        <div className="hint" style={{ marginTop: 0 }}>{game.name}</div>
        <div className="big">{value}{game.unit}</div>
        <div className="hint">{isNew ? '🏆 최고 기록 달성!' : '틀린 단어는 오답노트에 담았어요'}</div>
      </div>
      <div className="gap" />
      <div className="nb-btns">
        <button className="nb-btn ghost" onClick={onExit}>게임 목록</button>
        <button className="nb-btn" style={{ '--c': game.c }} onClick={onAgain}>한 판 더!</button>
      </div>
    </>
  )
}

function SpeedQuiz({ pool, game, onExit }) {
  const [round, setRound] = useState(0)
  const [time, setTime] = useState(60)
  const [score, setScore] = useState(0)
  const [q, setQ] = useState(null)
  const [flash, setFlash] = useState(null)
  const [result, setResult] = useState(null)
  const [, record] = useBest(game.id, game.better)
  const addWrong = useAddWrong()

  const makeQ = () => {
    const w = pool[Math.floor(Math.random() * pool.length)]
    const others = shuffle(pool.filter(x => x.meaning !== w.meaning)).slice(0, 3).map(x => x.meaning)
    return { w, opts: shuffle([w.meaning, ...others]) }
  }
  useEffect(() => { setTime(60); setScore(0); setResult(null); setQ(makeQ()) }, [round])
  useEffect(() => {
    if (result) return
    if (time <= 0) { setResult({ value: score, isNew: record(score) }); return }
    const t = setTimeout(() => setTime(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [time, result])

  if (result) return <Result game={game} {...result} onAgain={() => setRound(r => r + 1)} onExit={onExit} />
  if (!q) return null
  const pick = (o) => {
    if (flash) return
    const ok = o === q.w.meaning
    if (ok) setScore(s => s + 1); else addWrong(q.w)
    setFlash({ o, ok })
    setTimeout(() => { setFlash(null); setQ(makeQ()) }, ok ? 250 : 700)
  }
  return (
    <>
      <div className="nb-hud"><span>⏱ {time}초</span><span>정답 {score}</span></div>
      <div className="nb-bar" style={{ '--c': time <= 10 ? 'var(--nb-pink)' : 'var(--nb-green)' }}><i style={{ width: `${time / 60 * 100}%` }} /></div>
      <div className="nb-card nb-q" style={{ marginTop: 12 }}><div className="big">{q.w.word}</div></div>
      <div className="nb-opts">
        {q.opts.map(o => {
          let c = 'nb-opt'
          if (flash) c += o === q.w.meaning ? ' ok' : o === flash.o ? ' no' : ' dim'
          return <button key={o} className={c} onClick={() => pick(o)}>{o}</button>
        })}
      </div>
    </>
  )
}

function Match({ pool, game, onExit }) {
  const [round, setRound] = useState(0)
  const tiles = useMemo(() => {
    const ws = shuffle(pool).filter((w, i, a) => a.findIndex(x => x.meaning === w.meaning) === i).slice(0, 6)
    return shuffle(ws.flatMap((w, i) => [{ k: `w${i}`, pair: i, text: w.word, jp: true }, { k: `m${i}`, pair: i, text: w.meaning }]))
  }, [pool, round])
  const [sel, setSel] = useState(null)
  const [gone, setGone] = useState([])
  const [bad, setBad] = useState([])
  const start = useRef(Date.now())
  const [result, setResult] = useState(null)
  const [, record] = useBest(game.id, game.better)
  const [now, setNow] = useState(0)

  useEffect(() => { setSel(null); setGone([]); setBad([]); setResult(null); start.current = Date.now() }, [round])
  useEffect(() => {
    if (result) return
    const t = setInterval(() => setNow(Math.floor((Date.now() - start.current) / 1000)), 250)
    return () => clearInterval(t)
  }, [result, round])

  if (result) return <Result game={game} {...result} onAgain={() => setRound(r => r + 1)} onExit={onExit} />
  const tap = (t) => {
    if (gone.includes(t.k) || bad.length) return
    if (!sel) { setSel(t); return }
    if (sel.k === t.k) { setSel(null); return }
    if (sel.pair === t.pair) {
      const g = [...gone, sel.k, t.k]
      setGone(g); setSel(null)
      if (g.length === tiles.length) {
        const secs = Math.max(1, Math.round((Date.now() - start.current) / 1000))
        setResult({ value: secs, isNew: record(secs) })
      }
    } else {
      setBad([sel.k, t.k]); setSel(null)
      setTimeout(() => setBad([]), 450)
    }
  }
  return (
    <>
      <div className="nb-hud"><span>⏱ {now}초</span><span>{gone.length / 2} / {tiles.length / 2} 쌍</span></div>
      <div className="match-grid" style={{ marginTop: 10 }}>
        {tiles.map(t => (
          <button key={t.k} className={`match-tile${t.jp ? ' jp' : ''}${sel?.k === t.k ? ' sel' : ''}${bad.includes(t.k) ? ' bad' : ''}${gone.includes(t.k) ? ' gone' : ''}`} onClick={() => tap(t)}>
            {t.text}
          </button>
        ))}
      </div>
    </>
  )
}

const READING_N = 10

function ReadingQuiz({ pool, game, onExit }) {
  const [round, setRound] = useState(0)
  const qs = useMemo(() => {
    const withR = pool.filter(w => w.reading)
    return shuffle(withR).slice(0, READING_N).map(w => {
      // 글자 수가 비슷한 읽기를 오답으로
      const others = shuffle(withR.filter(x => x.reading !== w.reading))
        .sort((a, b) => Math.abs(a.reading.length - w.reading.length) - Math.abs(b.reading.length - w.reading.length))
        .slice(0, 3).map(x => x.reading)
      return { w, opts: shuffle([w.reading, ...others]) }
    })
  }, [pool, round])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState(null)
  const [, record] = useBest(game.id, game.better)
  const addWrong = useAddWrong()

  useEffect(() => { setIdx(0); setPicked(null); setScore(0); setResult(null) }, [round])
  if (result) return <Result game={game} {...result} onAgain={() => setRound(r => r + 1)} onExit={onExit} />
  const q = qs[idx]
  if (!q) return null
  const pick = (o) => {
    if (picked) return
    setPicked(o)
    if (o === q.w.reading) setScore(s => s + 1); else addWrong(q.w)
  }
  const next = () => {
    if (idx === qs.length - 1) { const v = Math.round(score / qs.length * 100); setResult({ value: v, isNew: record(v) }); return }
    setIdx(i => i + 1); setPicked(null)
  }
  return (
    <>
      <div className="nb-hud"><span>{idx + 1} / {qs.length}</span><span>정답 {score}</span></div>
      <div className="nb-bar" style={{ '--c': game.c }}><i style={{ width: `${(idx + 1) / qs.length * 100}%` }} /></div>
      <div className="nb-card nb-q" style={{ marginTop: 12 }}>
        <div className="big">{q.w.word}</div>
        {picked && <div className="hint">{q.w.meaning}</div>}
      </div>
      <div className="nb-opts">
        {q.opts.map(o => {
          let c = 'nb-opt jp'
          if (picked) c += o === q.w.reading ? ' ok' : o === picked ? ' no' : ' dim'
          return <button key={o} className={c} onClick={() => pick(o)}>{o}</button>
        })}
      </div>
      {picked && <><div className="gap" /><button className="nb-btn" style={{ '--c': game.c }} onClick={next}>{idx === qs.length - 1 ? '결과 보기' : '다음 →'}</button></>}
    </>
  )
}

export default function GamePage() {
  const { getLevel, my } = useProgress()
  const [playing, setPlaying] = useState(null)
  const pool = useMemo(() => {
    const all = [...learnedWords(getLevel), ...my.words.filter(w => w.meaning)]
    return all.filter((w, i) => all.findIndex(x => x.word === w.word) === i)
  }, [getLevel, my.words])

  const game = GAMES.find(g => g.id === playing)
  const exit = () => setPlaying(null)
  const readingCount = pool.filter(w => w.reading).length

  return (
    <div className="screen nb">
      <NbHeader title={game ? game.name : '단어 게임'} onBack={game ? exit : undefined} />
      <div className="scroll">
        {game?.id === 'speed' && <SpeedQuiz pool={pool} game={game} onExit={exit} />}
        {game?.id === 'match' && <Match pool={pool} game={game} onExit={exit} />}
        {game?.id === 'reading' && <ReadingQuiz pool={pool} game={game} onExit={exit} />}
        {!game && (
          <>
            <div className="nb-card" style={{ marginBottom: 20 }}>
              <b>외운 단어 {pool.length}개</b>로 게임해요
              <p className="nb-p" style={{ marginTop: 4 }}>플래시카드에서 본 단어와 나만의 단어장 단어가 나와요. 틀린 단어는 오답노트에 자동으로 담겨요.</p>
            </div>
            {pool.length < MIN_WORDS ? (
              <div className="nb-empty"><span className="big">🎮</span>게임을 하려면 단어가 {MIN_WORDS}개 이상 필요해요.<br />플래시카드로 단어를 조금 더 외우고 와요!</div>
            ) : (
              <div className="nb-list">
                {GAMES.map(g => {
                  const best = my.best?.[g.id]
                  const disabled = g.id === 'reading' && readingCount < 4
                  return (
                    <button key={g.id} className="nb-card nb-row" style={{ marginTop: 0, opacity: disabled ? .5 : 1 }} disabled={disabled} onClick={() => setPlaying(g.id)}>
                      <span className="nb-ico" style={{ '--c': g.c }}>▶</span>
                      <span className="grow">
                        <div className="t">{g.name}</div>
                        <div className="s">{g.desc}</div>
                      </span>
                      <span className="nb-chip" style={{ '--c': g.c }}>{best == null ? '기록 없음' : `🏆 ${best}${g.unit}`}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
