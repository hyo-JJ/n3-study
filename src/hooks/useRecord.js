import { useCallback } from 'react'
import { useProgress, today } from './useProgress'

// 학습 기록 — 마이페이지의 학습일·연속 학습·점수 통계에 쓰임 (나만의 기록 MY에 저장)
// log: { 'YYYY-MM-DD': 그날 끝낸 학습 수 }, scores: 최근 테스트·퀴즈 점수 100개
export function useRecord() {
  const { updateMy } = useProgress()
  return useCallback((score) => updateMy(m => {
    const d = today()
    const log = { ...(m.log ?? {}), [d]: ((m.log ?? {})[d] || 0) + 1 }
    const days = Object.keys(log).sort()
    if (days.length > 400) days.slice(0, days.length - 400).forEach(k => delete log[k])
    const scores = score ? [...(m.scores ?? []), { ...score, at: Date.now() }].slice(-100) : (m.scores ?? [])
    return { ...m, log, scores }
  }), [updateMy])
}
