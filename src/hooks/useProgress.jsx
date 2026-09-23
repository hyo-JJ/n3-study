import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const ProgressContext = createContext(null)

const DEFAULT = () => ({
  passedDays: [],
  flashProgress: {},
  blankProgress: {},
  wrongWords: [],
  passedAt: {}, // { [dayNum]: 'YYYY-MM-DD' } — 하루 1 Day 제한용
})

// 로컬 기준 오늘 날짜 (YYYY-MM-DD)
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ProgressProvider({ children }) {
  const user = useAuth()
  const [progress, setProgress] = useState({}) // { N3: {...}, N4: {...} }
  const [syncing, setSyncing] = useState(false)
  const saveTimer = useRef(null)

  const getLevel = useCallback((level) => progress[level] ?? DEFAULT(), [progress])

  const setLevel = useCallback((level, updater) => {
    setProgress(prev => {
      const current = prev[level] ?? DEFAULT()
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [level]: next }
    })
  }, [])

  // Load all levels on login
  useEffect(() => {
    if (!user) { setProgress({}); return }
    const load = async () => {
      const { data } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
      if (data) {
        const map = {}
        data.forEach(row => {
          // passedAt은 별도 컬럼 없이 flash_progress._passedAt에 함께 저장
          const { _passedAt, ...flashProgress } = row.flash_progress ?? {}
          map[row.level] = {
            passedDays: row.passed_days ?? [],
            flashProgress,
            passedAt: _passedAt ?? {},
            blankProgress: row.blank_progress ?? {},
            wrongWords: row.wrong_words ?? [],
          }
        })
        setProgress(map)
      }
    }
    load()
  }, [user])

  // Debounced save
  const save = useCallback((level, st) => {
    if (!user) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSyncing(true)
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        level,
        passed_days: st.passedDays,
        flash_progress: { ...st.flashProgress, _passedAt: st.passedAt ?? {} },
        blank_progress: st.blankProgress,
        wrong_words: st.wrongWords,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,level' })
      setSyncing(false)
    }, 1200)
  }, [user])

  const update = useCallback((level, updater) => {
    setProgress(prev => {
      const current = prev[level] ?? DEFAULT()
      const next = typeof updater === 'function' ? updater(current) : updater
      save(level, next)
      return { ...prev, [level]: next }
    })
  }, [save])

  return (
    <ProgressContext.Provider value={{ getLevel, update, syncing }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
