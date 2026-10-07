import { useEffect, useState } from 'react'
import { useProfile } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../lib/supabase'
import { LEVELS } from '../lib/data'
import * as Ico from '../components/Icons'

const COLS = ['N1', 'N2', 'N3', 'N4', 'N5']
const when = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 학생 한 명 — 레벨별 마지막으로 끝낸 Day와 정답률 (supabase/members.sql의 admin_overview)
function Student({ s }) {
  const rows = Object.fromEntries((s.progress ?? []).map(p => [p.level, p]))
  const last = (s.progress ?? []).map(p => p.updated_at).sort().pop()
  return (
    <div className="nb-card" style={{ marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: s.joined ? 10 : 0 }}>
        <b style={{ fontSize: 17 }}>{s.name}</b>
        <span className="nb-chip" style={{ '--c': 'var(--nb-yellow)' }}>{s.level}</span>
        <span className="sp" style={{ flex: 1 }} />
        {s.joined
          ? <span className="nb-p" style={{ fontSize: 12 }}>{last ? `최근 ${when(last)}` : '아직 학습 전'}</span>
          : <span className="nb-chip" style={{ '--c': 'var(--nb-gray)' }}>가입안함</span>}
      </div>
      {s.joined && (
        <div style={{ overflowX: 'auto' }}>
          <table className="nb-table">
            <thead><tr><th></th>{COLS.map(l => <th key={l}>{l}</th>)}</tr></thead>
            <tbody>
              <tr>
                <td><b>Day</b></td>
                {COLS.map(l => {
                  const days = rows[l]?.passed_days ?? []
                  return <td key={l}>{days.length ? `D${Math.max(...days)}` : '—'}<br /><small>/{LEVELS[l].days.length}</small></td>
                })}
              </tr>
              <tr>
                <td><b>정답률</b></td>
                {COLS.map(l => {
                  const st = rows[l]?.stats
                  return <td key={l}>{st?.total ? `${Math.round(st.correct / st.total * 100)}%` : '—'}{st?.total ? <><br /><small>{st.correct}/{st.total}</small></> : null}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 관리자 화면 — 명단 전체의 가입 여부·진도·정답률
export default function AdminPage() {
  const profile = useProfile()
  const { toggle, isDark } = useTheme()
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')

  const load = async () => {
    setErr('')
    const { data, error } = await supabase.rpc('admin_overview')
    if (error) { setErr('학생 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요'); return }
    setList(data)
  }
  useEffect(() => { load() }, [])

  const logout = async () => { if (confirm('로그아웃 하시겠어요?')) await supabase.auth.signOut() }
  const joined = list?.filter(s => s.joined).length ?? 0

  return (
    <div className="screen nb">
      <div className="nb-head">
        <button className="nb-ibtn" aria-label="테마 바꾸기" onClick={toggle}>{isDark ? <Ico.Sun /> : <Ico.Moon />}</button>
        <span className="sp" />
        <button className="nb-btn ghost sm" onClick={load}>새로고침</button>
      </div>
      <div className="scroll">
        <h1 className="nb-hero">
          학생 관리
          <small>{profile.name} 관리자님 👋</small>
        </h1>
        <p className="nb-p" style={{ marginBottom: 14 }}>
          {list ? `명단 ${list.length}명 중 ${joined}명 가입` : '불러오는 중...'} · Day는 레벨별로 마지막에 끝낸 Day, 정답률은 누적 테스트·문법 퀴즈 기준이에요.
        </p>
        {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
        <div className="nb-list">
          {list?.map(s => <Student key={s.name} s={s} />)}
        </div>
        <button className="nb-btn ghost" style={{ margin: '24px 0 8px' }} onClick={logout}>로그아웃</button>
      </div>
    </div>
  )
}
