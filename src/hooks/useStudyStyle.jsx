import { createContext, useCallback, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PACE, COGNITIVE } from '../lib/studyStyle'
import { useAuth } from './useAuth'

const StudyStyleContext = createContext(null)

// 공부 성향은 테이블 변경 없이 로그인 계정 정보(user_metadata.study_style)에 저장 — 다른 기기에서도 그대로
// 서버 저장이 실패해도 바로 쓸 수 있도록 기기에도 백업
const key = (userId) => `kotoba.style:${userId}`
const valid = (s) => !!s && !!PACE[s.pace] && !!COGNITIVE[s.cognitive]
const readLocal = (userId) => {
  try { const s = JSON.parse(localStorage.getItem(key(userId))); return valid(s) ? s : null } catch { return null }
}

export function StudyStyleProvider({ children }) {
  const user = useAuth()
  const userId = user?.id
  const fromServer = user?.user_metadata?.study_style
  const [saved, setSaved] = useState(null) // 방금 고른 성향 (서버 반영 전에도 바로 적용)

  const style = !userId ? null
    : saved?.userId === userId ? saved.s
    : valid(fromServer) ? fromServer : readLocal(userId)

  const save = useCallback(async (next) => {
    // source: 'quiz'(4문항) | 'ai'(내 AI에게 물어보기), reason: AI가 말한 이유
    const s = { pace: next.pace, cognitive: next.cognitive, source: next.source, answers: next.answers, reason: next.reason, at: new Date().toISOString() }
    setSaved({ userId, s })
    try { localStorage.setItem(key(userId), JSON.stringify(s)) } catch {}
    const { error } = await supabase.auth.updateUser({ data: { study_style: s } })
    if (error) console.error('공부 성향 저장 실패', error)
  }, [userId])

  return <StudyStyleContext.Provider value={{ style, save }}>{children}</StudyStyleContext.Provider>
}

export const useStudyStyle = () => useContext(StudyStyleContext)
