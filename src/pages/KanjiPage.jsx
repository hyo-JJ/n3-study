import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useKanji, KANJI_LV } from '../lib/kanji'
import { COGNITIVE } from '../lib/studyStyle'

const INITIALS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

// 상용한자 — 세트 목록 (순서 제한 없이 아무 세트나)
export default function KanjiPage() {
  const data = useKanji()
  const navigate = useNavigate()
  const { getLevel } = useProgress()
  const plan = usePlan()
  const [ini, setIni] = useState(null)
  const st = getLevel(KANJI_LV)

  if (!data) return <div className="loader"><div className="spin" /></div>

  const learned = st.passedDays.reduce((s, n) => s + (data.sets[n - 1]?.list.length ?? 0), 0)
  const next = data.sets.find(s => !st.passedDays.includes(s.n))
  const status = (s) => {
    if (st.passedDays.includes(s.n)) return ['완료 ✓', 'done', 'done']
    const seen = st.flashProgress[s.n] || 0
    if (seen >= s.list.length) return ['테스트', 'test', 'go']
    if (seen > 0) return ['이어하기', 'go', 'go']
    return ['시작', 'go', 'go']
  }
  const open = (s) => navigate((st.flashProgress[s.n] || 0) >= s.list.length && !st.passedDays.includes(s.n) ? `/kanji/${s.n}/test` : `/kanji/${s.n}/learn`)
  const sets = ini ? data.sets.filter(s => s.initials.includes(ini)) : data.sets

  return (
    <div className="screen nb">
      <NbHeader title="상용한자" />
      <div className="scroll">
        <p className="nb-p" style={{ marginBottom: 14 }}>
          상용한자 {data.all.length.toLocaleString()}자를 음(가나다) 순서로 20자씩 묶었어요. 세트마다 <b>{COGNITIVE[plan.screen].name}</b>으로 익히고 확인 테스트를 70점 이상 받으면 완료!
        </p>

        <div className="stats">
          <div className="stat"><div className="stat-n">{st.passedDays.length}<small>/{data.sets.length}</small></div><div className="stat-l">완료 세트</div></div>
          <div className="stat"><div className="stat-n">{learned}</div><div className="stat-l">외운 한자</div></div>
          <div className="stat"><div className="stat-n">{st.wrongWords.length}</div><div className="stat-l">틀린 한자</div></div>
        </div>

        <div className="nb-btns" style={{ marginBottom: 16 }}>
          {next && <button className="nb-btn" onClick={() => open(next)}>▶ {next.n}세트 {status(next)[0]}</button>}
          {st.wrongWords.length > 0 && <button className="nb-btn ghost" onClick={() => navigate('/kanji/wrong')}>틀린 한자 {st.wrongWords.length}</button>}
        </div>

        <div className="nb-tabs" style={{ marginBottom: 12 }}>
          <button className={`nb-tab${!ini ? ' on' : ''}`} onClick={() => setIni(null)}>전체</button>
          {INITIALS.map(i => <button key={i} className={`nb-tab${ini === i ? ' on' : ''}`} onClick={() => setIni(i)}>{i}</button>)}
        </div>

        <div className="day-list">
          {sets.map(s => {
            const [pill, pillC, badgeC] = status(s)
            return (
              <button key={s.n} className="day-card" onClick={() => open(s)}>
                <div className={`day-badge ${badgeC}`}>
                  <span className="dn">{s.n}</span>
                  <span className="dl">SET</span>
                </div>
                <div className="day-info">
                  <div className="day-nm">{s.title} <span className="jp kj-peek">{s.list.slice(0, 6).map(k => k.kanji).join('')}…</span></div>
                  <div className="day-wc">{s.list.length}자</div>
                </div>
                <span className={`pill ${pillC}`}>{pill}</span>
              </button>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
