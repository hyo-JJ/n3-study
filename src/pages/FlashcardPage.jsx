import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { usePlan } from '../hooks/useStudyStyle'
import { useLearnStep } from '../hooks/useLearnStep'
import { getDay } from '../lib/data'
import LearnSession from '../components/learn/Session'

const BADGE = { visual: '① 단어 카드', textual: '① 단어 목록', pragmatic: '① 바로 퀴즈' }

// ① 단어 익히기 — 학습 프로필에 맞는 화면(카드·목록·퀴즈)과 세트 크기로
export default function FlashcardPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const dayData = getDay(level, dayNum)
  const plan = usePlan()
  const items = useMemo(() => (dayData?.words ?? []).map(w => ({ key: w.no, word: w.word, reading: w.reading, meaning: w.meaning, writable: true })), [dayData])
  const step = useLearnStep(level, dayNum, items.length)

  if (!dayData) return null
  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} · ${dayData.topic}`} onBack={step.exit} />
      <div className="fc-wrap">
        <LearnSession items={items} screen={plan.screen} chunk={plan.chunk} feedback={plan.feedback} recall={plan.recall}
          badge={BADGE[plan.screen]} start={step.start}
          onProgress={step.onProgress} onFinish={step.onFinish} onStop={step.onStop}
          finishLabel={step.reviewOnly ? '복습 끝 ✓' : '다 외웠어요 → 백지 복습'} />
      </div>
    </div>
  )
}
