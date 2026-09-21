import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', pw: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const ERRS = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않아요',
    'Email not confirmed': '이메일 인증이 필요해요',
    'User already registered': '이미 가입된 이메일이에요',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 해요',
  }
  const errMsg = (e) => ERRS[e.message] || e.message

  const doLogin = async () => {
    if (!form.email || !form.pw) return setErr('이메일과 비밀번호를 입력해주세요')
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.pw })
    if (error) setErr(errMsg(error))
    setLoading(false)
  }

  const doSignup = async () => {
    if (!form.name || !form.email || !form.pw) return setErr('모든 항목을 입력해주세요')
    if (form.pw.length < 6) return setErr('비밀번호는 6자 이상이어야 해요')
    setLoading(true); setErr(''); setInfo('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.pw,
      options: { data: { full_name: form.name } },
    })
    if (error) setErr(errMsg(error))
    else if (data.user && !data.session) setInfo('📧 이메일로 확인 링크를 보냈어요. 확인 후 로그인해주세요!')
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo">🎌</div>
      <div className="auth-name">こと<em>ば</em></div>
      <div className="auth-sub">하루 한 Day, 꾸준히 N3 정복</div>
      <div className="auth-box">
        <div className="seg">
          <button className={`seg-btn${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setErr(''); setInfo('') }}>로그인</button>
          <button className={`seg-btn${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setErr(''); setInfo('') }}>회원가입</button>
        </div>

        {tab === 'login' ? (
          <>
            <div className="fld"><label>이메일</label><input type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            <div className="fld"><label>비밀번호</label><input type="password" placeholder="••••••" value={form.pw} onChange={set('pw')} onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            {err && <div className="err-msg">{err}</div>}
            <button className="btn btn-accent" onClick={doLogin} disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
          </>
        ) : (
          <>
            <div className="fld"><label>이름</label><input type="text" placeholder="홍길동" value={form.name} onChange={set('name')} /></div>
            <div className="fld"><label>이메일</label><input type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} /></div>
            <div className="fld"><label>비밀번호 (6자 이상)</label><input type="password" placeholder="••••••" value={form.pw} onChange={set('pw')} onKeyDown={e => e.key === 'Enter' && doSignup()} /></div>
            {err && <div className="err-msg">{err}</div>}
            {info && <div className="info-msg">{info}</div>}
            <button className="btn btn-accent" onClick={doSignup} disabled={loading}>{loading ? '가입 중...' : '회원가입'}</button>
          </>
        )}
      </div>
    </div>
  )
}
