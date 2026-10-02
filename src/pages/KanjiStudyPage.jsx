import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { useToast } from '../components/Toast'
import LearnSession, { MissList } from '../components/learn/Session'
import TestRunner from '../components/learn/TestRunner'
import { useKanji, kanjiItem, hunEum, KanjiDetail, KANJI_LV } from '../lib/kanji'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const BADGE = { visual: '① 한자 카드', textual: '① 한자 목록', pragmatic: '① 바로 퀴즈' }

// 상용한자 세트 — /kanji/:set/learn(익히기) · /kanji/:set/test(확인 테스트) · /kanji/wrong(틀린 한자)
export default function KanjiStudyPage({ mode }) {
  const data = useKanji()
  if (!data) return <div className="loader"><div className="spin" /></div>
  if (mode === 'wrong') return <KanjiWrong data={data} />
  return <KanjiSet data={data} mode={mode} />
}

function KanjiSet({ data, mode }) {
  const { set } = useParams()
  const n = Number(set)
  const s = data.sets[n - 1]
  const navigate = useNavigate()
  const toast = useToast()
  const plan = usePlan()
  const record = useRecord()
  const { getLevel, update } = useProgress()
  const st = getLevel(KANJI_LV)
  const passed = st.passedDays.includes(n)
  const items = useMemo(() => s?.list.map(kanjiItem) ?? [], [s])
  const [round, setRound] = useState(0)
  const [result, setResult] = useState(null)

  // 확인 테스트: 한자마다 한 문제 — 뜻·음(훈음) 고르기 또는 예시 단어 읽기 고르기
  const questions = useMemo(() => {
    if (!s) return []
    const meanings = data.all.map(hunEum)
    const readings = [...new Set(s.list.flatMap(k => k.words.map(w => w.reading)))]
    const near = [...new Set(s.list.map(hunEum))]
    return shuffle(s.list).map((k, i) => {
      const w = k.words.find(x => x.type === 'on') ?? k.words[0]
      const otherReadings = readings.filter(r => r !== w.reading)
      if (i % 2 && otherReadings.length >= 3) {
        return {
          key: `r${k.id}`, answer: w.reading, jp: true, hint: '이 단어의 읽는 법은?', missQ: w.word,
          opts: shuffle([w.reading, ...shuffle(otherReadings).slice(0, 3)]),
          q: () => <><div className="quiz-word jp">{w.word}</div><div className="quiz-hint">{w.meaning}</div></>,
          after: <KanjiDetail k={k} />, k,
        }
      }
      const ans = hunEum(k)
      const pool = near.filter(m => m !== ans)
      const others = shuffle(pool.length >= 3 ? pool : meanings.filter(m => m !== ans)).slice(0, 3)
      return {
        key: `m${k.id}`, answer: ans, hint: '이 한자의 뜻과 음은?', missQ: k.kanji,
        opts: shuffle([ans, ...others]),
        q: () => <div className="quiz-word jp" style={{ fontSize: 64 }}>{k.kanji}</div>,
        after: <KanjiDetail k={k} />, k,
      }
    })
  }, [s, round, data])

  if (!s) return null

  const onProgress = (seen) => {
    if (passed) return
    update(KANJI_LV, x => ({ ...x, flashProgress: { ...x.flashProgress, [n]: Math.max(seen, x.flashProgress[n] || 0) } }))
  }
  const toTest = () => { toast('다 익혔어요! 확인 테스트로 가요 📝'); setTimeout(() => navigate(`/kanji/${n}/test`, { replace: true }), 600) }

  const onAnswer = (q, ok) => {
    if (ok) return
    update(KANJI_LV, x => x.wrongWords.some(w => w.no === q.k.id) ? x
      : { ...x, wrongWords: [...x.wrongWords, { dn: n, no: q.k.id, word: q.k.kanji, meaning: hunEum(q.k) }] })
  }
  const onDone = (r) => {
    setResult(r)
    record({ kind: 'kanji', label: `상용한자 ${n}세트`, correct: r.correct, total: r.total })
  }
  const pass = () => {
    update(KANJI_LV, x => x.passedDays.includes(n) ? x : { ...x, passedDays: [...x.passedDays, n].sort((a, b) => a - b) })
    toast(`${n}세트 완료! 🎉`)
    navigate('/kanji')
  }

  const title = `${n}세트 · ${s.title}`
  const back = () => navigate('/kanji')

  if (mode === 'learn') {
    const saved = passed ? 0 : (st.flashProgress[n] || 0)
    return (
      <div className="screen">
        <Topbar title={title} onBack={() => { if (confirm('학습을 중단할까요?\n(진행 상황은 저장됩니다)')) back() }} />
        <div className="fc-wrap">
          <LearnSession items={items} screen={plan.screen} chunk={plan.chunk} feedback={plan.feedback} recall={plan.recall}
            badge={BADGE[plan.screen]} start={saved < items.length ? saved : 0} pool={data.all.map(hunEum)}
            onProgress={onProgress} onFinish={passed ? back : toTest} onStop={back}
            finishLabel={passed ? '복습 끝 ✓' : '다 외웠어요 → 확인 테스트'} />
        </div>
      </div>
    )
  }

  if (result) {
    const pct = Math.round(result.correct / result.total * 100)
    const ok = pct >= 70
    return (
      <div className="screen">
        <Topbar title={title} onBack={back} />
        <div className="fc-wrap">
          <div className="result-card">
            <div className="r-score" style={{ color: ok ? 'var(--ok)' : 'var(--err)' }}>{pct}점</div>
            <div className="r-msg">{ok ? '통과! 🎉' : '70점 이상이어야 통과에요'}</div>
            <div className="r-sub">{result.correct}/{result.total} 정답 · 틀린 한자는 '틀린 한자'에 모아뒀어요</div>
          </div>
          {plan.feedback === 'delayed' && <MissList misses={result.misses} />}
          {ok && !passed && <button className="btn btn-accent" style={{ marginBottom: 10 }} onClick={pass}>세트 완료하기 🎉</button>}
          <button className="btn btn-muted" style={{ marginBottom: 10 }} onClick={() => { setRound(r => r + 1); setResult(null) }}>다시 도전하기 🔄</button>
          <button className="btn btn-outline" style={{ marginBottom: 10 }} onClick={() => navigate(`/kanji/${n}/learn`)}>한 번 더 익히기</button>
          <button className="btn btn-outline" onClick={back}>세트 목록으로</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Topbar title={title} onBack={() => { if (confirm('테스트를 중단할까요?')) back() }} />
      <div className="fc-wrap">
        <TestRunner key={round} questions={questions} feedback={plan.feedback} badge="② 확인 테스트" onAnswer={onAnswer} onDone={onDone} />
      </div>
    </div>
  )
}

// 틀린 한자 다시 — 알았으면 목록에서 빠짐
function KanjiWrong({ data }) {
  const navigate = useNavigate()
  const toast = useToast()
  const plan = usePlan()
  const record = useRecord()
  const { getLevel, update } = useProgress()
  const wrong = getLevel(KANJI_LV).wrongWords
  const [items] = useState(() => shuffle(wrong).map(w => data.byId.get(w.no)).filter(Boolean).map(kanjiItem))

  const grade = (item, ok) => {
    if (ok) update(KANJI_LV, x => ({ ...x, wrongWords: x.wrongWords.filter(w => w.no !== item.key) }))
  }
  const done = () => { record(); toast('틀린 한자 복습 완료! ✅'); navigate('/kanji') }

  return (
    <div className="screen">
      <Topbar title="틀린 한자 다시" onBack={() => navigate('/kanji')} />
      <div className="fc-wrap">
        {!items.length ? (
          <div className="empty"><span className="ico">🎉</span>틀린 한자가 없어요!</div>
        ) : (
          <LearnSession items={items} screen={plan.screen} chunk={plan.chunk} feedback={plan.feedback} recall={plan.recall}
            badge="틀린 한자" pool={data.all.map(hunEum)} grade={grade}
            onFinish={done} onStop={() => navigate('/kanji')} finishLabel="다 봤어요 ✓" />
        )}
      </div>
    </div>
  )
}
