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

const toRow = (userId, level, st) => ({
  user_id: userId,
  level,
  passed_days: st.passedDays,
  flash_progress: { ...st.flashProgress, _passedAt: st.passedAt ?? {} },
  blank_progress: st.blankProgress,
  wrong_words: st.wrongWords,
  updated_at: new Date().toISOString(),
})

export function ProgressProvider({ children }) {
  const user = useAuth()
  const userId = user?.id
  const [progress, setProgress] = useState({}) // { N3: {...}, N4: {...} }
  const [loaded, setLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const saveTimer = useRef(null)
  const pending = useRef({}) // 아직 서버에 안 보낸 레벨별 최신 상태

  const getLevel = useCallback((level) => progress[level] ?? DEFAULT(), [progress])

  // 로그인한 사용자가 바뀔 때만 불러오기
  // (토큰 갱신·앱 복귀 때마다 다시 불러오면 저장 전 진행 상황이 옛 데이터로 덮여 사라짐)
  useEffect(() => {
    if (!userId) { setProgress({}); setLoaded(false); return }
    let cancelled = false
    const load = async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
      if (cancelled) return
      // 불러오기 실패 시 빈 상태로 시작하면 저장할 때 기존 기록을 덮어쓰므로 재시도
      if (error) { setTimeout(() => { if (!cancelled) load() }, 2000); return }
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
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    const levels = Object.entries(pending.current)
    if (!userId || !levels.length) return
    pending.current = {}
    setSyncing(true)
    await supabase.from('user_progress').upsert(
      levels.map(([level, st]) => toRow(userId, level, st)),
      { onConflict: 'user_id,level' },
    )
    setSyncing(false)
  }, [userId])

  // Debounced save — 레벨별로 모아뒀다가 한 번에 저장
  const save = useCallback((level, st) => {
    pending.current[level] = st
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 1200)
  }, [flush])

  // 학습 중간에 앱을 나가도(탭 전환·닫기) 저장 대기 중인 진행 상황을 바로 저장
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [flush])

  const update = useCallback((level, updater) => {
    setProgress(prev => {
      const current = prev[level] ?? DEFAULT()
      const next = typeof updater === 'function' ? updater(current) : updater
      save(level, next)
      return { ...prev, [level]: next }
    })
  }, [save])

  // 서버 데이터를 불러오기 전에 학습 화면이 열리면 빈 진행 상황으로 덮어쓸 수 있으므로 대기
  if (!loaded) {
    return (
      <div className="loader">
        <div className="spin" />
      </div>
    )
  }

  return (
    <ProgressContext.Provider value={{ getLevel, update, syncing }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
