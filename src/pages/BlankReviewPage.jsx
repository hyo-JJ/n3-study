import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { getDay } from '../lib/data'

export default function BlankReviewPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const dayData = getDay(level, dayNum)
  const navigate = useNavigate()
  const toast = useToast()
  const { update } = useProgress()

  const words = useMemo(() => [...(dayData?.words ?? [])].sort(() => Math.random() - .5), [dayData])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const mode = useMemo(() => (Math.random() > .5 ? 'kr' : 'jp'), [idx]) // eslint-disable-line

  if (!dayData) return null
  const word = words[idx]
  const total = words.length

  const reveal = () => setRevealed(true)

  const answer = (correct) => {
    if (!correct) {
      update(level, st => {
        const already = st.wrongWords.some(w => w.dn === dayNum && w.no === word.no)
        if (already) return st
        return { ...st, wrongWords: [...st.wrongWords, { dn: dayNum, no: word.no, word: word.word, meaning: word.meaning }] }
      })
    }
    const nextIdx = idx + 1
    update(level, st => ({ ...st, blankProgress: { ...st.blankProgress, [dayNum]: nextIdx } }))
    if (nextIdx >= total) {
      toast('백지 복습 완료! 🎉')
      setTimeout(() => {
        if (confirm(`Day ${dayNum} 학습 완료!\n누적 테스트를 통과하면 다음 Day가 열립니다.\n지금 시작할까요?`)) {
          navigate(`/quiz/${level}/${dayNum}`)
        } else {
          navigate('/home')
        }
      }, 500)
    } else {
      setIdx(nextIdx)
      setRevealed(false)
    }
  }

  const exitConfirm = () => {
    if (confirm('학습을 중단할까요?\n(진행 상황은 저장됩니다)')) navigate('/home')
  }

  const showKr = mode === 'kr'
  const showText = showKr ? word.meaning : word.word
  const answerText = showKr ? word.word : word.meaning

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} 백지 복습`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{idx + 1} / {total}</span>
          <span className="phase-badge">② 백지 복습</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / total * 100).toFixed(0)}%` }} /></div>

        <div className="blank-card">
          <div className="blank-prompt">{showKr ? '뜻을 보고 → 일본어를 떠올려보세요' : '일본어를 보고 → 뜻을 떠올려보세요'}</div>
          <div className={`blank-show${showKr ? '' : ' jp'}`}>{showText}</div>
          {revealed && <div className={`blank-ans${showKr ? ' jp' : ''}`}>{answerText}</div>}
        </div>

        {!revealed ? (
          <button className="btn btn-accent" onClick={reveal}>정답 확인</button>
        ) : (
          <div className="btn-row">
            <button className="btn btn-err" onClick={() => answer(false)}>❌ 몰랐어요</button>
            <button className="btn btn-ok" onClick={() => answer(true)}>✅ 알았어요</button>
          </div>
        )}
      </div>
    </div>
  )
}
