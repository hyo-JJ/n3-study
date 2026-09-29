import { useEffect, useMemo, useRef, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useAuth } from '../hooks/useAuth'
import { learnedWords } from '../lib/study'
import { gamePoints, addPoints, fetchLeaderboard, setNickname, defaultNickname } from '../lib/ranking'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const MIN_WORDS = 8

const GAMES = [
  { id: 'speed', name: '스피드 퀴즈', desc: '60초 동안 뜻을 최대한 많이 맞히기', c: 'var(--nb-pink)', unit: '개', better: 'high' },
  { id: 'match', name: '짝 맞추기', desc: '단어와 뜻 6쌍을 빨리 짝지어요', c: 'var(--nb-sky)', unit: '초', better: 'low' },
  { id: 'reading', name: '요미카타 퀴즈', desc: '한자를 보고 읽는 법 고르기 (10문제 · 문제당 10초)', c: 'var(--nb-lime)', unit: '점', better: 'high' },
]

// 문제가 바뀐 직후엔 잠깐 입력을 막아, 연달아 누른 손가락이 다음 문제 보기를 누르지 않게 한다
const TAP_LOCK_MS = 450
function useTapLock(key) {
  const readyAt = useRef(0)
  useEffect(() => { readyAt.current = Date.now() + TAP_LOCK_MS }, [key])
  return () => Date.now() >= readyAt.current
}

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

function Result({ game, value, isNew, points, onAgain, onExit }) {
  const user = useAuth()
  const [rank, setRank] = useState(null) // null = 적립 중, 숫자 = 이번 주 순위, false = 실패
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    addPoints(user, points)
      .then(ok => ok ? fetchLeaderboard(user, true) : Promise.reject())
      .then(rows => setRank(rows.find(r => r.user_id === user.id)?.rank ?? false))
      .catch(() => setRank(false))
  }, [])
  return (
    <>
      <div className="nb-card nb-q">
        <div className="hint" style={{ marginTop: 0 }}>{game.name}</div>
        <div className="big">{value}{game.unit}</div>
        <div className="hint">{isNew ? '🏆 최고 기록 달성!' : '틀린 단어는 오답노트에 담았어요'}</div>
        <div className="rk-earn">+{points}P</div>
        <div className="hint">
          {rank === null ? '포인트 적립 중...' : rank ? `이번 주 랭킹 ${rank}위` : '포인트는 다음에 연결되면 적립돼요'}
        </div>
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
  const canTap = useTapLock(q)

  const makeQ = () => {
    const w = pool[Math.floor(Math.random() * pool.length)]
    const others = shuffle(pool.filter(x => x.meaning !== w.meaning)).slice(0, 3).map(x => x.meaning)
    return { w, opts: shuffle([w.meaning, ...others]) }
  }
  useEffect(() => { setTime(60); setScore(0); setResult(null); setQ(makeQ()) }, [round])
  useEffect(() => {
    if (result) return
    if (time <= 0) { setResult({ value: score, isNew: record(score), points: gamePoints.speed(score) }); return }
    const t = setTimeout(() => setTime(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [time, result])

  if (result) return <Result game={game} {...result} onAgain={() => setRound(r => r + 1)} onExit={onExit} />
  if (!q) return null
  const pick = (o) => {
    if (flash || !canTap()) return
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
        setResult({ value: secs, isNew: record(secs), points: gamePoints.match(tiles.length / 2, secs) })
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
const READING_SEC = 10 // 문제당 제한 시간
const NEXT_MS = { ok: 1200, no: 2500 } // 정답 확인 후 다음 문제까지
const TIMEOUT = Symbol('timeout')

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
  const [left, setLeft] = useState(READING_SEC)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState(null)
  const [, record] = useBest(game.id, game.better)
  const addWrong = useAddWrong()
  const canTap = useTapLock(`${round}-${idx}`)
  const q = qs[idx]

  useEffect(() => { setIdx(0); setPicked(null); setLeft(READING_SEC); setScore(0); setResult(null) }, [round])

  // 제한 시간 카운트다운 — 0초가 되면 오답 처리
  useEffect(() => {
    if (result || picked || !q) return
    if (left <= 0) { setPicked(TIMEOUT); addWrong(q.w); return }
    const t = setTimeout(() => setLeft(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [left, picked, result, q])

  // 답을 확인할 시간을 준 뒤 자동으로 다음 문제
  const ok = picked === q?.w.reading
  useEffect(() => {
    if (!picked || result) return
    const t = setTimeout(() => {
      if (idx === qs.length - 1) {
        const v = Math.round(score / qs.length * 100)
        setResult({ value: v, isNew: record(v), points: gamePoints.reading(score) })
        return
      }
      setIdx(i => i + 1); setPicked(null); setLeft(READING_SEC)
    }, ok ? NEXT_MS.ok : NEXT_MS.no)
    return () => clearTimeout(t)
  }, [picked])

  if (result) return <Result game={game} {...result} onAgain={() => setRound(r => r + 1)} onExit={onExit} />
  if (!q) return null
  const pick = (o) => {
    if (picked || !canTap()) return
    setPicked(o)
    if (o === q.w.reading) setScore(s => s + 1); else addWrong(q.w)
  }
  const wait = ok ? NEXT_MS.ok : NEXT_MS.no
  return (
    <>
      <div className="nb-hud"><span>{idx + 1} / {qs.length} · 정답 {score}</span><span className={!picked && left <= 3 ? 'nb-hurry' : ''}>⏱ {picked ? '-' : left}초</span></div>
      {picked ? (
        <div className="nb-bar" style={{ '--c': 'var(--nb-sky)' }}><i key={idx} className="nb-drain" style={{ animationDuration: `${wait}ms` }} /></div>
      ) : (
        <div className="nb-bar" style={{ '--c': left <= 3 ? 'var(--nb-pink)' : game.c }}><i style={{ width: `${left / READING_SEC * 100}%` }} /></div>
      )}
      <div className="nb-card nb-q" style={{ marginTop: 12 }}>
        <div className="big">{q.w.word}</div>
        <div className="hint">{picked ? q.w.meaning : '읽는 법을 골라요'}</div>
      </div>
      <div className="nb-opts">
        {q.opts.map(o => {
          let c = 'nb-opt jp'
          if (picked) c += o === q.w.reading ? ' ok' : o === picked ? ' no' : ' dim'
          return <button key={o} className={c} onClick={() => pick(o)}>{o}</button>
        })}
      </div>
      {picked && (
        <p className="nb-p" style={{ marginTop: 14, textAlign: 'center', fontWeight: 800 }}>
          {picked === TIMEOUT ? '⏰ 시간 초과! ' : ok ? '⭕ 정답! ' : '❌ 오답! '}
          {idx === qs.length - 1 ? '곧 결과가 나와요' : '곧 다음 문제로 넘어가요'}
        </p>
      )}
    </>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

function Ranking() {
  const user = useAuth()
  const [weekly, setWeekly] = useState(true)
  const [rows, setRows] = useState(null) // null = 불러오는 중, 'error' = 실패
  const [editing, setEditing] = useState(false)
  const [nick, setNick] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setRows(null)
    fetchLeaderboard(user, weekly).then(d => alive && setRows(d), () => alive && setRows('error'))
    return () => { alive = false }
  }, [weekly, reload])

  const list = Array.isArray(rows) ? rows : []
  const mine = list.find(r => r.user_id === user.id)
  const startEdit = () => { setNick(mine?.nickname ?? defaultNickname(user)); setEditing(true) }
  const saveNick = async () => {
    const v = nick.trim()
    if (!v || v.length > 12) return alert('닉네임은 1~12자로 입력해주세요')
    try { await setNickname(v); setEditing(false); setReload(r => r + 1) } catch { alert('닉네임을 바꾸지 못했어요. 잠시 후 다시 시도해주세요') }
  }

  return (
    <>
      <div className="nb-card" style={{ marginBottom: 16 }}>
        <p className="nb-p">게임에서 <b>맞힌 개수 × 10P</b>가 쌓여요. 짝 맞추기는 빨리 끝낼수록 보너스! 이번 주 랭킹은 매주 월요일에 새로 시작해요.</p>
        {editing ? (
          <div className="rk-nick">
            <input className="nb-input" value={nick} maxLength={12} autoFocus onChange={e => setNick(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNick()} placeholder="닉네임 (1~12자)" />
            <button className="nb-btn sm" onClick={saveNick}>저장</button>
          </div>
        ) : (
          <div className="rk-nick">
            <span className="grow">내 닉네임 <b>{mine?.nickname ?? defaultNickname(user)}</b></span>
            <button className="nb-btn sm ghost" onClick={startEdit}>바꾸기</button>
          </div>
        )}
      </div>

      <div className="nb-tabs">
        <button className={`nb-tab${weekly ? ' on' : ''}`} onClick={() => setWeekly(true)}>이번 주</button>
        <button className={`nb-tab${!weekly ? ' on' : ''}`} onClick={() => setWeekly(false)}>전체 누적</button>
      </div>

      {rows === null && <div className="nb-empty">불러오는 중...</div>}
      {rows === 'error' && <div className="nb-empty"><span className="big">📡</span>랭킹을 불러오지 못했어요.<br />잠시 후 다시 시도해주세요.</div>}
      {Array.isArray(rows) && !list.length && <div className="nb-empty"><span className="big">🏁</span>아직 기록이 없어요.<br />첫 번째 1등이 되어보세요!</div>}
      {list.length > 0 && (
        <div className="rk-list">
          {list.map(r => (
            <div key={r.user_id} className={`rk-row${r.user_id === user.id ? ' me' : ''}${r.rank <= 3 ? ' top' : ''}`}>
              <span className="rk-rank">{MEDALS[r.rank - 1] ?? r.rank}</span>
              <span className="rk-name">{r.nickname}{r.user_id === user.id && <em> (나)</em>}</span>
              <span className="rk-pt">{r.points.toLocaleString()}P</span>
            </div>
          ))}
        </div>
      )}
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
  const ranking = playing === 'rank'
  const exit = () => setPlaying(null)
  const readingCount = pool.filter(w => w.reading).length

  return (
    <div className="screen nb">
      <NbHeader title={game ? game.name : ranking ? '게임 랭킹' : '단어 게임'} onBack={game || ranking ? exit : undefined} />
      <div className="scroll">
        {game?.id === 'speed' && <SpeedQuiz pool={pool} game={game} onExit={exit} />}
        {game?.id === 'match' && <Match pool={pool} game={game} onExit={exit} />}
        {game?.id === 'reading' && <ReadingQuiz pool={pool} game={game} onExit={exit} />}
        {ranking && <Ranking />}
        {!game && !ranking && (
          <>
            <div className="nb-card" style={{ marginBottom: 14 }}>
              <b>외운 단어 {pool.length}개</b>로 게임해요
              <p className="nb-p" style={{ marginTop: 4 }}>플래시카드에서 본 단어와 나만의 단어장 단어가 나와요. 틀린 단어는 오답노트에 자동으로 담겨요.</p>
            </div>
            <button className="nb-card nb-row" style={{ marginBottom: 20, background: 'var(--nb-yellow)', color: '#111' }} onClick={() => setPlaying('rank')}>
              <span className="nb-ico" style={{ '--c': 'var(--nb-card)', fontSize: 22 }}>🏆</span>
              <span className="grow">
                <div className="t">게임 랭킹</div>
                <div className="s" style={{ color: '#333' }}>맞힌 만큼 포인트를 모아 순위에 도전해요</div>
              </span>
              <span style={{ fontSize: 20, fontWeight: 900 }}>→</span>
            </button>
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
