import { LEVELS } from './data'
import { today } from '../hooks/useProgress'

// Day 잠금 규칙 — 순차 학습, dailyLimit 레벨(N3)은 하루 1 Day
const passedToday = (level, st, d) => LEVELS[level]?.dailyLimit && st.passedAt?.[d] === today()
export const isUnlocked = (level, st, d) =>
  d === 1 || st.passedDays.includes(d) || (st.passedDays.includes(d - 1) && !passedToday(level, st, d - 1))
export const opensTomorrow = (level, st, d) => !isUnlocked(level, st, d) && st.passedDays.includes(d - 1)

const words = (level, d) => LEVELS[level]?.days[d - 1]?.words ?? []
export const flashDone = (level, st, d) => (st.flashProgress[d] || 0) >= words(level, d).length
export const blankDone = (level, st, d) => (st.blankProgress[d] || 0) >= words(level, d).length

// Day를 눌렀을 때 이어서 할 단계
export const dayRoute = (level, st, d) => {
  if (st.passedDays.includes(d) || !flashDone(level, st, d)) return `/learn/${level}/${d}/flash`
  if (!blankDone(level, st, d)) return `/learn/${level}/${d}/blank`
  return `/quiz/${level}/${d}`
}

// 레벨 요약: 다음에 할 Day, 오늘 끝났는지
export const levelSummary = (level, st) => {
  const total = LEVELS[level]?.days.length ?? 0
  const next = Array.from({ length: total }, (_, i) => i + 1).find(d => !st.passedDays.includes(d))
  const doneToday = !!next && !isUnlocked(level, st, next)
  return { total, passed: st.passedDays.length, next, doneToday, allDone: !next }
}

// 지금까지 본 단어 (통과한 Day 전체 + 진행 중인 Day에서 넘긴 카드까지)
export const learnedWords = (getLevel) =>
  Object.keys(LEVELS).flatMap(level => {
    const st = getLevel(level)
    return LEVELS[level].days.flatMap((day, i) => {
      const d = i + 1
      const n = st.passedDays.includes(d) ? day.words.length : (st.flashProgress[d] || 0)
      return day.words.slice(0, n).map(w => ({ ...w, level, dn: d }))
    })
  })

export const levelHome = (level) => `/study/${level}`
