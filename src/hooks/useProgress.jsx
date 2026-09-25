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

// 나만의 단어장·게임 기록(MY)은 테이블 변경 없이 N3 행의 flash_progress._my에 함께 저장
export const MY = 'MY'
const MY_DEFAULT = () => ({ words: [], best: {} })

const toRow = (userId, level, st, my) => ({
  user_id: userId,
  level,
  passed_days: st.passedDays,
  flash_progress: { ...st.flashProgress, _passedAt: st.passedAt ?? {}, ...(my ? { _my: my } : {}) },
  blank_progress: st.blankProgress,
  wrong_words: st.wrongWords,
  updated_at: new Date().toISOString(),
})

// 서버 저장이 끝나기 전에 새로고침·종료돼도 날아가지 않도록 기기에 즉시 백업
// dirty: 아직 서버에 반영 안 된 행(level) 목록 — MY는 N3 행에 포함
const backupKey = (userId) => `progress:${userId}`
const readBackup = (userId) => {
  try { return JSON.parse(localStorage.getItem(backupKey(userId))) ?? null } catch { return null }
}
const writeBackup = (userId, data, dirty) => {
  try { localStorage.setItem(backupKey(userId), JSON.stringify({ data, dirty: [...dirty] })) } catch {}
}

export function ProgressProvider({ children }) {
  const user = useAuth()
  const userId = user?.id
  const [progress, setProgress] = useState({}) // { N3: {...}, N4: {...} }
  const [loaded, setLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const saveTimer = useRef(null)
  const pending = useRef(new Set()) // 아직 서버에 안 보낸 레벨
  const dirty = useRef(new Set()) // 서버 저장이 확인되지 않은 레벨 (백업에 기록)
  const latest = useRef({}) // 저장 시점의 최신 진행 상황

  const getLevel = useCallback((level) => progress[level] ?? DEFAULT(), [progress])
  const my = progress[MY] ?? MY_DEFAULT()

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
        const { _passedAt, _my, ...flashProgress } = row.flash_progress ?? {}
        if (_my) map[MY] = { ...MY_DEFAULT(), ..._my }
        map[row.level] = {
          passedDays: row.passed_days ?? [],
          flashProgress,
          passedAt: _passedAt ?? {},
          blankProgress: row.blank_progress ?? {},
          wrongWords: row.wrong_words ?? [],
        }
      })
      // 지난번에 서버에 못 보낸 기록이 기기에 남아 있으면 그걸 우선 쓰고 다시 저장
      const backup = readBackup(userId)
      const unsynced = (backup?.dirty ?? []).filter(level => backup.data?.[level])
      unsynced.forEach(level => {
        map[level] = backup.data[level]
        if (level === 'N3' && backup.data[MY]) map[MY] = backup.data[MY]
      })
      dirty.current = new Set(unsynced)
      pending.current = new Set(unsynced)
      latest.current = map
      writeBackup(userId, map, dirty.current)
      setProgress(map)
      setLoaded(true)
      if (unsynced.length) saveTimer.current = setTimeout(() => flushRef.current(), 0)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    const levels = [...pending.current]
    if (!userId || !levels.length) return
    pending.current = new Set()
    const all = latest.current
    setSyncing(true)
    // 레벨별로 따로 저장 — 한 행이 실패해도 나머지는 저장되도록
    const failed = []
    await Promise.all(levels.map(async level => {
      const { error } = await supabase.from('user_progress').upsert(
        toRow(userId, level, all[level] ?? DEFAULT(), level === 'N3' ? all[MY] : undefined),
        { onConflict: 'user_id,level' },
      )
      if (error) { console.error('진행 상황 저장 실패', level, error); failed.push(level) }
      // 저장 중에 또 바뀐 레벨은 다음 저장 때 반영되므로 dirty 유지
      else if (!pending.current.has(level)) dirty.current.delete(level)
    }))
    writeBackup(userId, latest.current, dirty.current)
    setSyncing(false)
    // 실패한 레벨은 잠시 뒤 다시 시도 (백업이 있어 새로고침해도 유지됨)
    if (failed.length) {
      failed.forEach(level => pending.current.add(level))
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => flushRef.current(), 5000)
    }
  }, [userId])
  const flushRef = useRef(flush)
  flushRef.current = flush

  // Debounced save — 레벨별로 모아뒀다가 한 번에 저장
  const save = useCallback((level) => {
    const row = level === MY ? 'N3' : level
    pending.current.add(row)
    dirty.current.add(row)
    writeBackup(userId, latest.current, dirty.current)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 1200)
  }, [flush, userId])

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
      const current = prev[level] ?? (level === MY ? MY_DEFAULT() : DEFAULT())
      const next = typeof updater === 'function' ? updater(current) : updater
      const all = { ...prev, [level]: next }
      latest.current = all
      save(level)
      return all
    })
  }, [save])

  const updateMy = useCallback((updater) => update(MY, updater), [update])

  // 서버 데이터를 불러오기 전에 학습 화면이 열리면 빈 진행 상황으로 덮어쓸 수 있으므로 대기
  if (!loaded) {
    return (
      <div className="loader">
        <div className="spin" />
      </div>
    )
  }

  return (
    <ProgressContext.Provider value={{ getLevel, update, my, updateMy, syncing }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
