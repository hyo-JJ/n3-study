import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { setMyLevel } from '../lib/level'

const AuthContext = createContext(null)
const ProfileContext = createContext(null)

// 가입할 때 명단에서 정해진 이름·레벨·역할 (profiles 테이블, 없으면 가입 때 넣은 정보로)
const fallbackProfile = (user) => ({
  name: user.user_metadata?.full_name || '학생',
  level: user.user_metadata?.level || 'N3',
  role: 'student',
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const userId = user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfile(null)
    if (!userId) return
    let cancelled = false
    supabase.from('profiles').select('name, level, role').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      const p = data ?? fallbackProfile(user)
      setMyLevel(p.level)
      setProfile(p)
    })
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 프로필을 불러오기 전까지는 로딩 상태로 (레벨에 따라 열리는 Day가 달라서)
  const value = user && !profile ? undefined : user
  return (
    <AuthContext.Provider value={value}>
      <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export const useProfile = () => useContext(ProfileContext)
