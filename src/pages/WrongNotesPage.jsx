import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { useToast } from '../components/Toast'
import { useActiveLevel } from '../hooks/useActiveLevel'
import { LEVELS } from '../lib/data'
import { wordOf } from '../lib/study'
import { visibleLevels } from '../lib/level'
import { COGNITIVE, REVIEW } from '../lib/studyStyle'
import LearnSession from '../components/learn/Session'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 저장된 오답 → 지금 데이터 기준 단어 (뜻을 보충했으면 최신 뜻으로)
const current = (level, w) => {
  const x = wordOf(level, w.dn, w.no)
  return { ...w, word: x?.word ?? w.word, reading: x?.reading, meaning: x?.meaning ?? w.meaning }
}

// 오답 재학습 — 학습 프로필의 화면(카드·목록·퀴즈)으로, 알았으면 오답노트에서 빠짐
function WrongStudy({ level, words, onDone }) {
  const plan = usePlan()
  const toast = useToast()
  const record = useRecord()
  const { update } = useProgress()
  const [items] = useState(() => shuffle(words).map(w => ({ key: `${w.dn}-${w.no}`, dn: w.dn, no: w.no, word: w.word, reading: w.reading, meaning: w.meaning, writable: true })))
  const pool = useMemo(() => LEVELS[level].days.flatMap(d => d.words.map(w => w.meaning)), [level])

  const grade = (item, ok) => {
    if (!ok) return
    update(level, st => ({ ...st, wrongWords: st.wrongWords.filter(x => !(x.dn === item.dn && x.no === item.no)) }))
    toast('✅ 오답노트에서 뺐어요')
  }
  const finish = () => { record(); toast('오답 복습 완료!'); setTimeout(onDone, 500) }

  return (
    <LearnSession items={items} screen={plan.screen} chunk={plan.chunk} feedback={plan.feedback} recall={plan.recall}
      badge={`오답 ${COGNITIVE[plan.screen].name}`} pool={pool} grade={grade}
      onFinish={finish} onStop={onDone} finishLabel="다 봤어요 ✓" />
  )
}

export default function WrongNotesPage() {
  const { getLevel } = useProgress()
  const plan = usePlan()
  const navigate = useNavigate()
  const [studying, setStudying] = useState(false)
  const [activeLevel, setActiveLevel] = useActiveLevel()
  const st = getLevel(activeLevel)
  const words = st.wrongWords.map(w => current(activeLevel, w))

  if (studying && words.length > 0) {
    return (
      <div className="screen">
        <Topbar title="오답 재학습" onBack={() => setStudying(false)} />
        <div className="fc-wrap">
          <WrongStudy level={activeLevel} words={words} onDone={() => setStudying(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Topbar title="오답노트" onBack={() => navigate('/review')} />
      <div className="scroll">
        <div className="level-tabs">
          {visibleLevels().map(key => [key, LEVELS[key]]).map(([key, val]) => (
            <button key={key} className={`level-tab${activeLevel === key ? ' active' : ''}`} onClick={() => setActiveLevel(key)}>
              {val.label} · {getLevel(key).wrongWords.length}
            </button>
          ))}
        </div>
        {plan.review === 'mistake-first' && words.length > 0 && (
          <div className="review-info">🎯 나는 오답 우선형 — {REVIEW['mistake-first']} 새 Day를 하기 전에 먼저 한 번 보고 가요.</div>
        )}
        {words.length === 0 ? (
          <div className="empty">
            <span className="ico">🎉</span>
            오답노트가 비어있어요!<br />모든 단어를 잘 알고 있네요.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="sec-hd" style={{ margin: 0 }}>오답 {words.length}개</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/print', { state: { title: `${activeLevel} 오답노트`, words: words.map(w => ({ ...w, level: activeLevel })) } })}>✍️ 쓰기 연습지</button>
                <button className="btn btn-accent btn-sm" onClick={() => setStudying(true)}>{COGNITIVE[plan.screen].emoji} 복습 시작</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {words.map((w, i) => (
                <div key={i} className="wrong-card">
                  <div>
                    <div className="jp" style={{ fontSize: 26, fontWeight: 700 }}>{w.word}</div>
                    <div style={{ fontSize: 14, color: 'var(--label3)', marginTop: 3 }}>{w.reading && <span className="jp" style={{ marginRight: 8 }}>{w.reading}</span>}{w.meaning}</div>
                    <div style={{ fontSize: 11, color: 'var(--label4)', marginTop: 2 }}>Day {w.dn}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
