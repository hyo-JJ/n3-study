import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { getLevelDays } from '../lib/data'

const QUIZ_COUNT = 20

export default function QuizPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const navigate = useNavigate()
  const toast = useToast()
  const { update } = useProgress()
  const allDays = getLevelDays(level)

  const questions = useMemo(() => {
    let pool = []
    for (let d = 1; d <= dayNum; d++) {
      allDays[d - 1]?.words.forEach(w => pool.push({ ...w, dn: d }))
    }
    return pool.sort(() => Math.random() - .5).slice(0, QUIZ_COUNT)
  }, [dayNum, allDays])

  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrongList, setWrongList] = useState([])
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)

  const q = questions[idx]
  const total = questions.length

  const opts = useMemo(() => {
    if (!q) return []
    let pool = []
    for (let d = 1; d <= dayNum; d++) allDays[d - 1]?.words.forEach(w => pool.push(w))
    const opts = [q.meaning]
    pool.filter(w => w.meaning !== q.meaning).sort(() => Math.random() - .5).slice(0, 3).forEach(w => opts.push(w.meaning))
    return opts.sort(() => Math.random() - .5)
  }, [q, dayNum, allDays])

  const answer = (opt) => {
    if (answered) return
    setAnswered(true)
    setSelected(opt)
    const ok = opt === q.meaning
    if (ok) setCorrect(c => c + 1)
    else {
      setWrongList(w => [...w, q])
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

  const handlePass = () => {
    update(level, st => {
      if (st.passedDays.includes(dayNum)) return st
      return { ...st, passedDays: [...st.passedDays, dayNum] }
    })
    toast(`Day ${dayNum + 1} 오픈! 🎉`)
    navigate('/home')
  }

  const retry = () => {
    setIdx(0); setCorrect(0); setWrongList([]); setAnswered(false); setSelected(null); setDone(false)
  }

  const exitConfirm = () => {
    if (confirm('테스트를 중단할까요?')) navigate('/home')
  }

  if (done) {
    return (
      <div className="screen">
        <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={() => navigate('/home')} />
        <div className="fc-wrap">
          <div className="result-card">
            <div className="r-score" style={{ color: passed ? 'var(--ok)' : 'var(--err)' }}>{pct}점</div>
            <div className="r-msg">{passed ? '통과! 🎉 다음 Day가 열렸어요!' : '70점 이상이어야 통과에요'}</div>
            <div className="r-sub">{correct}/{total} 정답 · 오답 {wrongList.length}개 저장됨</div>
          </div>
          {passed && <button className="btn btn-accent" onClick={handlePass} style={{ marginBottom: 10 }}>다음 Day 진입하기 🎉</button>}
          <button className="btn btn-muted" onClick={retry} style={{ marginBottom: 10 }}>다시 도전하기 🔄</button>
          <button className="btn btn-outline" onClick={() => navigate('/home')}>홈으로</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Topbar title={`Day 1~${dayNum} 누적 테스트`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{idx + 1} / {total}</span>
          <span className="phase-badge">③ 누적 테스트</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / total * 100).toFixed(0)}%` }} /></div>

        <div className="quiz-q">
          <div className="quiz-word jp">{q?.word}</div>
          <div className="quiz-hint">이 단어의 뜻은?</div>
        </div>

        <div className="opts">
          {opts.map(opt => {
            let cls = 'opt'
            if (answered) {
              if (opt === q.meaning) cls += ' correct'
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
