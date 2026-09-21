import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useTheme } from '../hooks/useTheme'

export function Topbar({ title, onBack }) {
  const navigate = useNavigate()
  const { syncing } = useProgress()
  const { toggle, isDark } = useTheme()
  const user = useAuth()

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠어요?')) await supabase.auth.signOut()
  }

  return (
    <div className="topbar">
      {onBack && (
        <button className="icon-btn" onClick={onBack || (() => navigate(-1))}>
          <span style={{ fontSize: 22 }}>←</span>
        </button>
      )}
      <span className="topbar-title" dangerouslySetInnerHTML={{ __html: title }} />
      <span className={`sync${syncing ? ' busy' : ''}`} />
      <button className="icon-btn" onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>
      {user && <button className="icon-btn" onClick={handleLogout}>👤</button>}
    </div>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { path: '/home', ico: '🏠', label: '홈' },
    { path: '/wrong', ico: '📝', label: '오답노트' },
    { path: '/weekend', ico: '🔄', label: '주말복습' },
  ]

  return (
    <div className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.path}
          className={`nav-btn${pathname.startsWith(t.path) ? ' active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className="nav-ico">{t.ico}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
