import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress, today } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { getLevelDays, LEVELS } from '../lib/data'
import { levelHome } from '../lib/study'
import { KANJI } from '../lib/furigana'

const QUIZ_COUNT = 30
const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 문제 유형: 뜻 고르기 / 요미카타 고르기 / 한자 고르기 / 뜻 보고 단어 고르기
const TYPES = {
  meaning: { badge: '뜻', hint: '이 단어의 뜻은?', ans: w => w.meaning, jpOpts: false },
  reading: { badge: '요미카타', hint: '읽는 법(요미카타)은?', ans: w => w.reading, jpOpts: true },
  kanji: { badge: '한자', hint: '어떤 한자로 쓸까요?', ans: w => w.word, jpOpts: true },
  word: { badge: '단어', hint: '이 뜻의 일본어는?', ans: w => w.word, jpOpts: true },
}
const hasKanji = (w) => !!w.reading && KANJI.test(w.word)
const typesFor = (w, kanjiOk) => kanjiOk && hasKanji(w) ? ['meaning', 'reading', 'kanji', 'word'] : ['meaning', 'word']

// 유형이 고르게 섞이도록 30문제 구성 (단어가 30개보다 적으면 같은 단어를 다른 유형으로 한 번 더)
function makeQuestions(pool, n) {
  const count = { meaning: 0, reading: 0, kanji: 0, word: 0 }
  const used = new Set()
  const out = []
  const words = shuffle(pool)
  // 한자 단어가 4개 미만이면 보기를 못 만드니 요미카타·한자 문제는 빼기
  const kanjiOk = new Set(pool.filter(hasKanji).map(w => w.reading)).size >= 4
  for (let pass = 0; pass < 4 && out.length < n; pass++) {
    for (const w of words) {
      if (out.length >= n) break
      const avail = shuffle(typesFor(w, kanjiOk).filter(t => !used.has(`${w.dn}-${w.no}-${t}`)))
      if (!avail.length) continue
      const type = avail.reduce((a, b) => count[b] < count[a] ? b : a)
      count[type]++
      used.add(`${w.dn}-${w.no}-${type}`)
      out.push({ ...w, type })
    }
  }
  return shuffle(out)
}

// 오답 보기: 같은 유형의 답을 가진 다른 단어 중에서 (글자 수가 비슷한 것 우선)
function makeOptions(q, pool) {
  const { ans } = TYPES[q.type]
  const right = ans(q)
  const cand = pool.filter(w => (q.type === 'kanji' || q.type === 'reading' ? hasKanji(w) : true) && ans(w) && ans(w) !== right && w.meaning !== q.meaning && (q.type !== 'kanji' || w.reading !== q.reading))
  const byLen = q.type === 'meaning' ? shuffle(cand)
    : shuffle(cand).sort((a, b) => Math.abs(ans(a).length - right.length) - Math.abs(ans(b).length - right.length))
  const others = [...new Set(byLen.map(ans))].slice(0, 3)
  return shuffle([right, ...others])
}

export default function QuizPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const navigate = useNavigate()
  const toast = useToast()
  const { update } = useProgress()
  const allDays = getLevelDays(level)

  const [round, setRound] = useState(0)
  const pool = useMemo(() => {
    const pool = []
    for (let d = 1; d <= dayNum; d++) allDays[d - 1]?.words.forEach(w => pool.push({ ...w, dn: d }))
    return pool
  }, [dayNum, allDays])
  const questions = useMemo(() => makeQuestions(pool, QUIZ_COUNT), [pool, round])

  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrongList, setWrongList] = useState([])
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)

  const q = questions[idx]
  const total = questions.length

  const opts = useMemo(() => q ? makeOptions(q, pool) : [], [q, pool])
  const type = q ? TYPES[q.type] : null
  const right = q ? type.ans(q) : null

  const answer = (opt) => {
    if (answered) return
    setAnswered(true)
    setSelected(opt)
    const ok = opt === right
    if (ok) setCorrect(c => c + 1)
    else {
      setWrongList(w => w.some(x => x.dn === q.dn && x.no === q.no) ? w : [...w, q])
      update(level, st => {
        const already = st.wrongWords.some(x => x.dn === q.dn && x.no === q.no)
        if (already) return st
        return { ...st, wrongWords: [...st.wrongWords, { dn: q.dn, no: q.no, word: q.word, meaning: q.meaning }] }
      })
    }
  }

  const next = () => {
    if (idx === total - 1) { setDone(true); return }
    setIdx(i => i + 1)
    setAnswered(false)
    setSelected(null)
  }

  const pct = Math.round(correct / total * 100)
  const passed = pct >= 70
  const dailyLimit = LEVELS[level]?.dailyLimit
  const hasNext = dayNum < allDays.length

  const handlePass = () => {
    update(level, st => {
      if (st.passedDays.includes(dayNum)) return st
      return { ...st, passedDays: [...st.passedDays, dayNum], passedAt: { ...st.passedAt, [dayNum]: today() } }
    })
    toast(!hasNext ? `Day ${dayNum} 완료! ${level} 전체 완주 🎉`
      : dailyLimit ? `Day ${dayNum} 완료! Day ${dayNum + 1}은 내일 열려요 🎉`
      : `Day ${dayNum} 완료! Day ${dayNum + 1} 오픈 🎉`)
    navigate(levelHome(level))
  }

  const retry = () => {
    setRound(r => r + 1)
    setIdx(0); setCorrect(0); setWrongList([]); setAnswered(false); setSelected(null); setDone(false)
  }

  const exitConfirm = () => {
    if (confirm('테스트를 중단할까요?')) navigate(levelHome(level))
  }

  if (done) {
    return (
      <div className="screen">
        <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={() => navigate(levelHome(level))} />
        <div className="fc-wrap">
          <div className="result-card">
            <div className="r-score" style={{ color: passed ? 'var(--ok)' : 'var(--err)' }}>{pct}점</div>
            <div className="r-msg">{!passed ? '70점 이상이어야 통과에요' : !hasNext ? '통과! 🎉 마지막 Day까지 완주했어요!' : dailyLimit ? '통과! 🎉 다음 Day는 내일 열려요!' : '통과! 🎉 다음 Day가 열렸어요!'}</div>
            <div className="r-sub">{correct}/{total} 정답 · 틀린 단어 {wrongList.length}개 오답노트에 저장됨</div>
          </div>
          {wrongList.length > 0 && (
            <button className="btn btn-outline" style={{ marginBottom: 10 }}
              onClick={() => navigate('/print', { state: { title: `${level} Day 1~${dayNum} 누적 테스트 오답`, words: wrongList } })}>
              ✍️ 틀린 단어 쓰기 연습지 (PDF)
            </button>
          )}
          {passed && <button className="btn btn-accent" onClick={handlePass} style={{ marginBottom: 10 }}>Day 완료하기 🎉</button>}
          <button className="btn btn-muted" onClick={retry} style={{ marginBottom: 10 }}>다시 도전하기 🔄</button>
          <button className="btn btn-outline" onClick={() => navigate(levelHome(level))}>Day 목록으로</button>
        </div>
      </div>
    )
  }

  if (!q) return null
  const big = (t) => ({ fontSize: t.length > 8 ? 26 : t.length > 5 ? 34 : undefined, wordBreak: 'keep-all' })
  return (
    <div className="screen">
      <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{idx + 1} / {total}</span>
          <span className="phase-badge">③ 누적 테스트 · {type.badge}</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / total * 100).toFixed(0)}%` }} /></div>

        <div className="quiz-q">
          {q.type === 'meaning' || q.type === 'reading' ? <div className="quiz-word jp" style={big(q.word)}>{q.word}</div>
            : q.type === 'kanji' ? <><div className="quiz-word jp" style={big(q.reading)}>{q.reading}</div><div className="quiz-hint">{q.meaning}</div></>
            : <div className="quiz-word" style={{ fontSize: 30 }}>{q.meaning}</div>}
          <div className="quiz-hint">{type.hint}</div>
          {answered && (
            <div className="quiz-hint jp" style={{ fontSize: 15, color: 'var(--label2)' }}>
              {q.word}{q.reading && q.reading !== q.word ? `（${q.reading}）` : ''} · {q.meaning}
            </div>
          )}
        </div>

        <div className="opts">
          {opts.map(opt => {
            let cls = type.jpOpts ? 'opt jp' : 'opt'
            if (answered) {
              if (opt === right) cls += ' correct'
              else if (opt === selected) cls += ' wrong'
              else cls += ' reveal'
            }
            return <button key={opt} className={cls} onClick={() => answer(opt)}>{opt}</button>
          })}
        </div>

        <div className="gap" />
        {answered && (
          <button className="btn btn-accent" onClick={next}>
            {idx === total - 1 ? '결과 보기 →' : '다음 →'}
          </button>
        )}
      </div>
    </div>
  )
}
