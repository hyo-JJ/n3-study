import { useState } from 'react'
import { LEVELS } from '../lib/data'

const KEY = 'kotoba.level'

// 마지막으로 고른 레벨을 기억 (홈·오답노트 공통)
export function useActiveLevel() {
  const [level, setLevel] = useState(() => {
    try { const v = localStorage.getItem(KEY); if (LEVELS[v]) return v } catch {}
    return 'N3'
  })
  const set = (v) => {
    setLevel(v)
    try { localStorage.setItem(KEY, v) } catch {}
  }
  return [level, set]
}
