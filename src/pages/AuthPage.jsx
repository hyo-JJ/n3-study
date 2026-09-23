import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ID_DOMAIN = '@kotoba.local'
const toEmail = (id) => `${id.trim().toLowerCase()}${ID_DOMAIN}`
const ID_RE = /^[a-z0-9_]{4,20}$/i

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', username: '', pw: '', pw2: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const ERRS = {
    'Invalid login credentials': '아이디 또는 비밀번호가 올바르지 않아요',
    'User already registered': '이미 사용 중인 아이디예요',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 해요',
  }
  const errMsg = (e) => ERRS[e.message] || e.message

  const doLogin = async () => {
    if (!form.username || !form.pw) return setErr('아이디와 비밀번호를 입력해주세요')
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(form.username), password: form.pw })
    if (error) setErr(errMsg(error))
    setLoading(false)
  }

  const doSignup = async () => {
    if (!form.name || !form.username || !form.pw || !form.pw2) return setErr('모든 항목을 입력해주세요')
    if (!ID_RE.test(form.username)) return setErr('아이디는 영문/숫자/밑줄 4~20자로 입력해주세요')
    if (form.pw.length < 6) return setErr('비밀번호는 6자 이상이어야 해요')
    if (form.pw !== form.pw2) return setErr('비밀번호가 일치하지 않아요')
    setLoading(true); setErr(''); setInfo('')
    const { data, error } = await supabase.auth.signUp({
      email: toEmail(form.username),
      password: form.pw,
      options: { data: { full_name: form.name, username: form.username.trim().toLowerCase() } },
    })
    if (error) setErr(errMsg(error))
    else if (data.user && !data.session) setInfo('가입이 완료됐어요. 로그인해주세요!')
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
            <div className="fld"><label>아이디</label><input type="text" placeholder="아이디" value={form.username} onChange={set('username')} onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            <div className="fld"><label>비밀번호</label><input type="password" placeholder="••••••" value={form.pw} onChange={set('pw')} onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            {err && <div className="err-msg">{err}</div>}
            <button className="btn btn-accent" onClick={doLogin} disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
          </>
        ) : (
          <>
            <div className="fld"><label>이름</label><input type="text" placeholder="홍길동" value={form.name} onChange={set('name')} /></div>
            <div className="fld"><label>아이디</label><input type="text" placeholder="영문/숫자/밑줄 4~20자" value={form.username} onChange={set('username')} /></div>
            <div className="fld"><label>비밀번호 (6자 이상)</label><input type="password" placeholder="••••••" value={form.pw} onChange={set('pw')} /></div>
            <div className="fld"><label>비밀번호 확인</label><input type="password" placeholder="••••••" value={form.pw2} onChange={set('pw2')} onKeyDown={e => e.key === 'Enter' && doSignup()} /></div>
            {err && <div className="err-msg">{err}</div>}
            {info && <div className="info-msg">{info}</div>}
            <button className="btn btn-accent" onClick={doSignup} disabled={loading}>{loading ? '가입 중...' : '회원가입'}</button>
          </>
        )}
      </div>
    </div>
  )
}
