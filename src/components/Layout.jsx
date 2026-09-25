import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useTheme } from '../hooks/useTheme'
import * as Ico from './Icons'

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

// 네오브루탈 화면용 상단 바
export function NbHeader({ title, onBack, right }) {
  const navigate = useNavigate()
  const { syncing } = useProgress()
  const { toggle, isDark } = useTheme()

  return (
    <div className="nb-head">
      {onBack !== false && (
        <button className="nb-ibtn" aria-label="뒤로" onClick={onBack || (() => navigate('/home'))}><Ico.Back /></button>
      )}
      <span className="nb-head-title">{title}</span>
      <span className={`nb-dot${syncing ? ' busy' : ''}`} title={syncing ? '저장 중' : '저장됨'} />
      {right}
      <button className="nb-ibtn" aria-label="테마 바꾸기" onClick={toggle}>{isDark ? <Ico.Sun /> : <Ico.Moon />}</button>
    </div>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { path: '/home', match: ['/home', '/study'], ico: <Ico.Home />, label: '홈' },
    { path: '/review', match: ['/review', '/wrong', '/weekend'], ico: <Ico.Book />, label: '복습' },
    { path: '/game', match: ['/game'], ico: <Ico.Plane />, label: '게임' },
    { path: '/mywords', match: ['/mywords'], ico: <Ico.Heart />, label: '단어장' },
  ]

  return (
    <div className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.path}
          className={`nav-btn${t.match.some(m => pathname.startsWith(m)) ? ' active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className="nav-ico">{t.ico}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
