import { LEVELS } from './data'
import { GRAMMAR } from './data/jlpt'
import { today } from '../hooks/useProgress'
import { isDaily, prevLevel } from './level'

// Day 잠금 규칙 — 순차 학습, 내 레벨 이상은 하루 1 Day (lib/level.js)
const passedToday = (level, st, d) => isDaily(level) && st.passedAt?.[d] === today()
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

// 내 레벨보다 어려운 레벨은 바로 아래 레벨을 다 끝내야 열림
export const levelLocked = (level, getLevel) => {
  const prev = prevLevel(level)
  return !!prev && !levelSummary(prev, getLevel(prev)).allDone
}

// 간격 반복 — 통과한 지 1·3·7·14·30일째인 Day가 오늘 복습할 Day
const INTERVALS = [1, 3, 7, 14, 30]
const daysSince = (date) => Math.round((new Date(today()) - new Date(date)) / 864e5)
export const dueDays = (st) => st.passedDays.filter(d => st.passedAt?.[d] && INTERVALS.includes(daysSince(st.passedAt[d])))

// 저장된 오답(단어·뜻 스냅샷) 대신 지금 데이터의 단어 — 뜻을 보충해도 최신으로 보이도록
export const wordOf = (level, dn, no) => LEVELS[level]?.days[dn - 1]?.words.find(w => w.no === no)

// 복습 방식에 따라 먼저 나올 단어 (dn-no 키 집합)
// mistake-first: 오답 / spaced: 오늘 복습할 Day / mixed: 둘 다 / cumulative: 없음(고르게)
export function priorityKeys(review, level, st, maxDay) {
  const keys = new Set()
  if (review === 'mistake-first' || review === 'mixed') st.wrongWords.forEach(w => w.dn <= maxDay && keys.add(`${w.dn}-${w.no}`))
  if (review === 'spaced' || review === 'mixed') {
    dueDays(st).filter(d => d <= maxDay).forEach(d => LEVELS[level]?.days[d - 1]?.words.forEach(w => keys.add(`${d}-${w.no}`)))
  }
  return keys
}

// 문법도 하루에 1 Day(5개)씩 — 진행은 나만의 기록(MY)의 grammarDays[레벨]에 { passed, at } 로 저장
export const GRAMMAR_PER_DAY = 5
export const grammarDays = (lv) => {
  const all = GRAMMAR[lv] ?? []
  return Array.from({ length: Math.ceil(all.length / GRAMMAR_PER_DAY) }, (_, i) => all.slice(i * GRAMMAR_PER_DAY, (i + 1) * GRAMMAR_PER_DAY))
}
export const grammarState = (my, lv) => ({ passed: [], at: {}, ...(my.grammarDays?.[lv] ?? {}) })
export const grammarUnlocked = (gs, d) =>
  d === 1 || gs.passed.includes(d) || (gs.passed.includes(d - 1) && gs.at[d - 1] !== today())
