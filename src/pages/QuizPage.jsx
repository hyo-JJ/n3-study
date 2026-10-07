import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress, today } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { useToast } from '../components/Toast'
import { getLevelDays } from '../lib/data'
import { levelHome, priorityKeys } from '../lib/study'
import { isDaily } from '../lib/level'
import TestRunner from '../components/learn/TestRunner'
import { MissList } from '../components/learn/Session'
import { KANJI } from '../lib/furigana'
import { cleanReading } from '../lib/reading'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 문제 유형: 뜻 고르기 / 요미카타 고르기 / 한자 고르기 / 뜻 보고 단어 고르기
const TYPES = {
  meaning: { badge: '뜻', hint: '이 단어의 뜻은?', ans: w => w.meaning, jpOpts: false },
  reading: { badge: '요미카타', hint: '읽는 법(요미카타)은?', ans: w => cleanReading(w.reading), jpOpts: true },
  kanji: { badge: '한자', hint: '어떤 한자로 쓸까요?', ans: w => w.word, jpOpts: true },
  word: { badge: '단어', hint: '이 뜻의 일본어는?', ans: w => w.word, jpOpts: true },
}
const hasKanji = (w) => !!w.reading && KANJI.test(w.word)
const typesFor = (w, kanjiOk) => kanjiOk && hasKanji(w) ? ['meaning', 'reading', 'kanji', 'word'] : ['meaning', 'word']

// 유형이 고르게 섞이도록 n문제 구성 (단어가 n개보다 적으면 같은 단어를 다른 유형으로 한 번 더)
// words 순서대로 문제를 만들므로 먼저 나와야 할 단어를 앞에 둔다
function makeQuestions(words, n) {
  const count = { meaning: 0, reading: 0, kanji: 0, word: 0 }
  const used = new Set()
  const out = []
  // 한자 단어가 4개 미만이면 보기를 못 만드니 요미카타·한자 문제는 빼기
  const kanjiOk = new Set(words.filter(hasKanji).map(w => w.reading)).size >= 4
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

// 복습 방식에 맞춰 먼저 나올 단어(오답·오늘 복습할 Day)를 문제의 절반까지 앞에 두기
function orderWords(pool, prio, n) {
  const first = shuffle(pool.filter(w => prio.has(`${w.dn}-${w.no}`))).slice(0, Math.ceil(n / 2))
  const firstSet = new Set(first)
  return [...first, ...shuffle(pool.filter(w => !firstSet.has(w)))]
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
  const { getLevel, update, addStats } = useProgress()
  const plan = usePlan()
  const record = useRecord()
  const allDays = getLevelDays(level)

  const [round, setRound] = useState(0)
  const pool = useMemo(() => {
    const pool = []
    for (let d = 1; d <= dayNum; d++) allDays[d - 1]?.words.forEach(w => pool.push({ ...w, dn: d }))
    return pool
  }, [dayNum, allDays])
  // 문제 수는 학습 호흡, 먼저 나올 단어는 복습 방식에 맞춤
  const questions = useMemo(() => {
    const prio = priorityKeys(plan.review, level, getLevel(level), dayNum)
    return makeQuestions(orderWords(pool, prio, plan.testSize), plan.testSize).map(q => {
      const type = TYPES[q.type]
      return {
        ...q,
        key: `${q.dn}-${q.no}-${q.type}`,
        answer: type.ans(q),
        opts: makeOptions(q, pool),
        jp: type.jpOpts,
        hint: type.hint,
        missQ: q.type === 'word' ? q.meaning : q.type === 'kanji' ? q.reading : q.word,
        q: (answered) => (
          <>
            {q.type === 'meaning' || q.type === 'reading' ? <div className="quiz-word jp" style={big(q.word)}>{q.word}</div>
              : q.type === 'kanji' ? <><div className="quiz-word jp" style={big(q.reading)}>{q.reading}</div><div className="quiz-hint">{q.meaning}</div></>
              : <div className="quiz-word" style={{ fontSize: 30 }}>{q.meaning}</div>}
            {answered && (
              <div className="quiz-hint jp" style={{ fontSize: 15, color: 'var(--label2)' }}>
                {q.word}{q.reading && q.reading !== q.word ? `（${q.reading}）` : ''} · {q.meaning}
              </div>
            )}
          </>
        ),
      }
    })
  }, [pool, round]) // eslint-disable-line react-hooks/exhaustive-deps

  const [result, setResult] = useState(null) // { correct, total, misses }
  const [wrongList, setWrongList] = useState([])

  const onAnswer = (q, ok) => {
    if (ok) return
    setWrongList(w => w.some(x => x.dn === q.dn && x.no === q.no) ? w : [...w, q])
    update(level, st => {
      const already = st.wrongWords.some(x => x.dn === q.dn && x.no === q.no)
      if (already) return st
      return { ...st, wrongWords: [...st.wrongWords, { dn: q.dn, no: q.no, word: q.word, meaning: q.meaning }] }
    })
  }

  const onDone = (r) => {
    setResult(r)
    addStats(level, r.correct, r.total)
    record({ kind: 'test', label: `${level} Day 1~${dayNum} 누적 테스트`, correct: r.correct, total: r.total })
  }

  const dailyLimit = isDaily(level)
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

  const retry = () => { setRound(r => r + 1); setResult(null); setWrongList([]) }

  const exitConfirm = () => {
    if (confirm('테스트를 중단할까요?')) navigate(levelHome(level))
  }

  if (result) {
    const pct = Math.round(result.correct / result.total * 100)
    const passed = pct >= 70
    return (
      <div className="screen">
        <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={() => navigate(levelHome(level))} />
        <div className="fc-wrap">
          <div className="result-card">
            <div className="r-score" style={{ color: passed ? 'var(--ok)' : 'var(--err)' }}>{pct}점</div>
            <div className="r-msg">{!passed ? '70점 이상이어야 통과에요' : !hasNext ? '통과! 🎉 마지막 Day까지 완주했어요!' : dailyLimit ? '통과! 🎉 다음 Day는 내일 열려요!' : '통과! 🎉 다음 Day가 열렸어요!'}</div>
            <div className="r-sub">{result.correct}/{result.total} 정답 · 틀린 단어 {wrongList.length}개 오답노트에 저장됨</div>
          </div>
          {plan.feedback === 'delayed' && <MissList misses={result.misses} />}
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

  return (
    <div className="screen">
      <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <TestRunner key={round} questions={questions} feedback={plan.feedback}
          badge={(q) => `③ 누적 테스트 · ${TYPES[q.type].badge}`} onAnswer={onAnswer} onDone={onDone} />
      </div>
    </div>
  )
}

const big = (t) => ({ fontSize: t.length > 8 ? 26 : t.length > 5 ? 34 : undefined, wordBreak: 'keep-all' })
