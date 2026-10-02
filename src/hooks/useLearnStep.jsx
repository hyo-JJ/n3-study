import { useNavigate } from 'react-router-dom'
import { useProgress } from './useProgress'
import { useRecord } from './useRecord'
import { useToast } from '../components/Toast'
import { levelHome } from '../lib/study'

// ① 단어 익히기 단계 — 카드형·목록형·퀴즈형이 같은 진행 기록(flashProgress)을 씀
export function useLearnStep(level, dayNum, total) {
  const navigate = useNavigate()
  const toast = useToast()
  const record = useRecord()
  const { getLevel, update } = useProgress()
  const st = getLevel(level)

  const reviewOnly = st.passedDays.includes(dayNum)
  const saved = reviewOnly ? 0 : (st.flashProgress[dayNum] || 0)
  const start = saved < total ? saved : 0

  // n번째 단어까지 봤음 (이전으로 돌아갔다 와도 기록이 줄지 않도록)
  const onProgress = (n) => {
    if (reviewOnly) return
    update(level, s => ({ ...s, flashProgress: { ...s.flashProgress, [dayNum]: Math.max(n, s.flashProgress[dayNum] || 0) } }))
  }

  const onFinish = () => {
    record()
    if (reviewOnly) { toast('단어 복습 완료! ✅'); navigate(levelHome(level)); return }
    toast('단어 익히기 완료! 백지 복습으로 이동합니다 📝')
    setTimeout(() => navigate(`/learn/${level}/${dayNum}/blank`), 700)
  }

  const onStop = () => navigate(levelHome(level))
  const exit = () => {
    if (confirm('학습을 중단할까요?\n(진행 상황은 저장됩니다)')) onStop()
  }

  return { reviewOnly, start, onProgress, onFinish, onStop, exit }
}
