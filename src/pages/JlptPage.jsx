import { useMemo, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { Pic } from '../components/Icons'
import { useProgress, today } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { useToast } from '../components/Toast'
import TestRunner from '../components/learn/TestRunner'
import { GRAMMAR_PER_DAY, grammarDays, grammarState, grammarUnlocked } from '../lib/study'
import { getMyLevel } from '../lib/level'
import { EXAM_INFO, QUESTION_TYPES, STRATEGY, GRAMMAR, nextExam } from '../lib/data/jlpt'

const TABS = ['시험 안내', '문제 유형', '문법', '문법 퀴즈']
const GL = ['N3', 'N4', 'N5']
const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)
const answerOf = (g) => g.ex.match(/【(.+?)】/)[1]

// 예문의 【】 부분을 강조 표시
function Example({ ex, blank }) {
  const [a, b] = ex.split(/【.+?】/)
  return <>{a}{blank ? <span style={{ borderBottom: '3px solid currentColor', padding: '0 18px' }}>{blank === true ? '' : blank}</span> : <mark>{answerOf({ ex })}</mark>}{b}</>
}

// 문법은 N5~N3까지 — 내 레벨 문법부터 (N2·N1 학생은 N3)
function useGrammarLevel() {
  return useState(GL.includes(getMyLevel()) ? getMyLevel() : 'N3')
}

function LevelTabs({ value, onChange }) {
  return (
    <div className="nb-tabs">
      {GL.map(l => <button key={l} className={`nb-tab${value === l ? ' on' : ''}`} onClick={() => onChange(l)}>{l} · {grammarDays(l).length} Day</button>)}
    </div>
  )
}

function ExamInfo() {
  const { date, dday } = nextExam()
  return (
    <>
      <div className="nb-card nb-dday">
        <span className="n">D-{dday}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>다음 JLPT</div>
          <div className="nb-p">{date.getFullYear()}년 {date.getMonth() + 1}월 {date.getDate()}일 (일)</div>
        </div>
      </div>

      <h3 className="nb-h pic-h"><Pic name="calendar" />시험 일정</h3>
      <div className="nb-card">
        {EXAM_INFO.schedule.map((t, i) => <p key={i} className="nb-p" style={{ marginTop: i ? 8 : 0 }}>• {t}</p>)}
      </div>

      <h3 className="nb-h">⏱ 시험 시간 (분)</h3>
      <div className="nb-card" style={{ padding: 10, overflowX: 'auto' }}>
        <table className="nb-table">
          <thead><tr><th>급수</th><th>문자·어휘</th><th>문법·독해</th><th>청해</th></tr></thead>
          <tbody>
            {EXAM_INFO.levels.map(l => (
              <tr key={l.lv}><td><b>{l.lv}</b></td><td>{l.vocab}</td><td>{l.grammarReading}</td><td>{l.listening}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="nb-h">✅ 합격 기준</h3>
      <div className="nb-list">
        {EXAM_INFO.levels.map(l => (
          <div key={l.lv} className="nb-card" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="nb-chip" style={{ '--c': 'var(--nb-yellow)' }}>{l.lv}</span>
              <b>총점 {l.pass}점 이상</b>
            </div>
            <p className="nb-p">과목별 기준점: {l.sections}</p>
          </div>
        ))}
      </div>
      <p className="nb-p" style={{ marginTop: 12 }}>⚠️ {EXAM_INFO.passNote}</p>

      <h3 className="nb-h">💡 시험 전략</h3>
      <div className="nb-list">
        {STRATEGY.map(s => (
          <div key={s.t} className="nb-card" style={{ marginTop: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>{s.t}</div>
            <p className="nb-p">{s.d}</p>
          </div>
        ))}
      </div>
      <p className="nb-p" style={{ marginTop: 16, fontSize: 12 }}>출처: JLPT 공식 사이트(jlpt.jp), 한국 JLPT(jlpt.or.kr). 접수 일정은 매년 바뀌니 공식 사이트에서 꼭 확인하세요.</p>
    </>
  )
}

function Types() {
  return (
    <>
      <p className="nb-p" style={{ marginBottom: 4 }}>N3 기준 문제 구성이에요. N4·N5도 비슷한 유형으로 나와요. (문항 수는 대략치예요)</p>
      {QUESTION_TYPES.map(sec => (
        <div key={sec.section}>
          <h3 className="nb-h">{sec.section}</h3>
          <div className="nb-list">
            {sec.items.map(it => (
              <div key={it.jp} className="nb-card" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <b className="jp" style={{ fontSize: 16 }}>{it.jp}</b>
                  <span style={{ fontWeight: 700 }}>{it.ko}</span>
                  <span className="nb-chip" style={{ marginLeft: 'auto', '--c': 'var(--nb-lime)' }}>{it.n}</span>
                </div>
                <p className="nb-p" style={{ marginTop: 6 }}>{it.tip}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// 문법 한 개 — 설명·예문 펼쳐 보기
function GrammarCard({ g, open, onToggle }) {
  return (
    <div className="nb-card gm" style={{ marginTop: 0 }}>
      <div className="gm-top">
        <button className="gm-head" onClick={onToggle}>
          <div className="gm-p">{g.p}</div>
          <div className="gm-m">{g.m}</div>
        </button>
      </div>
      {open && (
        <>
          <div className="gm-c">접속: {g.c}</div>
          {g.d && <p className="gm-d">{g.d}</p>}
          <div className="gm-ex">
            <div className="jp"><Example ex={g.ex} /></div>
            <div className="gm-ko">{g.ko}</div>
          </div>
        </>
      )}
    </div>
  )
}

// 문법 퀴즈 한 판 — 피드백은 프로필 방식, 틀린 문법은 기록(오답 우선형이 먼저 풀도록), 결과는 레벨 정답률에 더함
function GrammarTest({ lv, items, label, actions }) {
  const { updateMy, addStats } = useProgress()
  const plan = usePlan()
  const record = useRecord()
  const [result, setResult] = useState(null)

  const qs = useMemo(() => shuffle(items).map(g => {
    const ans = answerOf(g)
    const others = shuffle(GRAMMAR[lv].filter(x => answerOf(x) !== ans)).slice(0, 3).map(answerOf)
    return {
      key: g.p, g, answer: ans, jp: true, hint: g.ko, missQ: g.ex.replace(/【.+?】/, '（　）'),
      opts: shuffle([ans, ...others]),
      q: (answered) => <div className="sent"><Example ex={g.ex} blank={answered ? ans : true} /></div>,
      after: <><b className="jp">{g.p}</b> — {g.m}<div className="gm-c">접속: {g.c}</div>{g.d && <p className="gm-d">{g.d}</p>}</>,
    }
  }), [items, lv])

  const onAnswer = (q, ok) => updateMy(m => {
    const next = { ...(m.grammarWrong ?? {}) }
    if (ok) delete next[`${lv}:${q.g.p}`]; else next[`${lv}:${q.g.p}`] = 1
    return { ...m, grammarWrong: next }
  })
  const onDone = (r) => {
    setResult(r)
    addStats(lv, r.correct, r.total)
    record({ kind: 'grammar', label, correct: r.correct, total: r.total })
  }

  if (result) {
    const pct = result.correct / result.total
    return (
      <>
        <div className="nb-card nb-q">
          <div className="big">{result.correct} / {result.total}</div>
          <div className="hint">{pct >= .8 ? '훌륭해요! 🎉' : pct >= .5 ? '좋아요, 틀린 문법만 다시 보면 완벽! 💪' : '설명을 한 번 더 읽어보고 도전해요 📖'}</div>
        </div>
        {plan.feedback === 'delayed' && result.misses.length > 0 && (
          <div className="nb-card">
            <b>틀린 문제 {result.misses.length}개</b>
            {result.misses.map((m, i) => <p key={i} className="nb-p" style={{ marginTop: 8 }}><span className="jp">{m.q}</span><br />정답 <b className="jp">{m.a}</b> · 내 답 <s className="jp">{m.picked}</s></p>)}
          </div>
        )}
        <div className="gap" />
        {actions(result, () => setResult(null))}
      </>
    )
  }
  return <TestRunner questions={qs} feedback={plan.feedback} variant="nb" onAnswer={onAnswer} onDone={onDone} />
}

// 문법 — 하루에 1 Day(5개)씩, 확인 퀴즈를 통과하면 다음 Day는 내일 열림
function Grammar() {
  const plan = usePlan()
  const toast = useToast()
  const { my, updateMy } = useProgress()
  const [lv, setLv] = useGrammarLevel()
  const [day, setDay] = useState(null)
  const [quiz, setQuiz] = useState(0) // 0 = 설명 보기, 1 이상 = 퀴즈 회차
  const [open, setOpen] = useState(null)
  const expandAll = plan.screen === 'textual' // 목록형(텍스트)은 처음부터 다 펼쳐서

  const days = grammarDays(lv)
  const gs = grammarState(my, lv)
  const passedAll = gs.passed.length

  const pass = (d) => updateMy(m => {
    const cur = grammarState(m, lv)
    if (cur.passed.includes(d)) return m
    return { ...m, grammarDays: { ...(m.grammarDays ?? {}), [lv]: { passed: [...cur.passed, d], at: { ...cur.at, [d]: today() } } } }
  })

  if (day) {
    const items = days[day - 1]
    const back = () => { setDay(null); setQuiz(0); setOpen(null) }
    return (
      <>
        <button className="nb-btn ghost sm" onClick={back}>← Day 목록</button>
        <h3 className="nb-h">{lv} 문법 Day {day}</h3>
        {quiz ? (
          <GrammarTest key={quiz} lv={lv} items={items} label={`${lv} 문법 Day ${day}`}
            actions={(r, reset) => {
              const ok = r.correct / r.total >= .7
              return (
                <>
                  <p className="nb-p" style={{ marginBottom: 10 }}>{ok ? (gs.passed.includes(day) ? '복습 완료!' : '통과! 다음 문법 Day는 내일 열려요 🌙') : '70% 이상 맞혀야 통과예요. 설명을 다시 보고 도전해요!'}</p>
                  {ok && !gs.passed.includes(day) && <button className="nb-btn" onClick={() => { pass(day); toast(`문법 Day ${day} 완료! 🎉`); back() }}>Day 완료하기 🎉</button>}
                  <button className="nb-btn ghost" style={{ marginTop: 10 }} onClick={() => { reset(); setQuiz(q => q + 1) }}>다시 풀기 🔄</button>
                  <button className="nb-btn ghost" style={{ marginTop: 10 }} onClick={() => setQuiz(0)}>설명 다시 보기</button>
                </>
              )
            }} />
        ) : (
          <>
            <div className="nb-list">
              {items.map(g => <GrammarCard key={g.p} g={g} open={expandAll || open === g.p} onToggle={() => setOpen(open === g.p ? null : g.p)} />)}
            </div>
            <div className="gap" />
            <button className="nb-btn" onClick={() => setQuiz(1)}>확인 퀴즈 {items.length}문제 →</button>
          </>
        )}
      </>
    )
  }

  const openDay = (d) => {
    if (grammarUnlocked(gs, d)) { setDay(d); return }
    if (gs.passed.includes(d - 1)) toast('오늘 문법은 끝! 이 Day는 내일 열려요 🌙')
  }

  return (
    <>
      <LevelTabs value={lv} onChange={l => { setLv(l); setDay(null) }} />
      <div className="nb-card" style={{ marginBottom: 14, padding: 12 }}>
        <div className="nb-hud" style={{ marginBottom: 0 }}><span>끝낸 문법 Day</span><span>{passedAll} / {days.length}</span></div>
        <div className="nb-bar"><i style={{ width: `${passedAll / days.length * 100}%` }} /></div>
        <p className="nb-p" style={{ fontSize: 12 }}>하루에 문법 {GRAMMAR_PER_DAY}개씩! 설명을 읽고 확인 퀴즈를 통과하면 다음 Day는 내일 열려요.</p>
      </div>
      <div className="day-list">
        {days.map((items, i) => {
          const n = i + 1
          const u = grammarUnlocked(gs, n), p = gs.passed.includes(n)
          const [pill, c] = p ? ['완료 ✓', 'done'] : u ? ['시작', 'go'] : gs.passed.includes(n - 1) ? ['내일 열림', 'lock'] : ['잠김', 'lock']
          return (
            <button key={n} className={`day-card${u ? '' : ' locked'}`} onClick={() => openDay(n)}>
              <div className={`day-badge ${p ? 'done' : u ? 'go' : 'lock'}`}>
                <span className="dn">{n}</span>
                <span className="dl">DAY</span>
              </div>
              <div className="day-info">
                <div className="day-nm">{items[0].cat || items[0].p}</div>
                <div className="day-wc jp">{items.map(g => g.p).join(' · ')}</div>
              </div>
              <span className={`pill ${c}`}>{pill}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// 문법 퀴즈 — 끝낸 문법 Day에서만 출제, 오답 우선형이면 틀렸던 문법부터
function GrammarQuiz() {
  const [lv, setLv] = useGrammarLevel()
  const [round, setRound] = useState(0)
  const { my } = useProgress()
  const plan = usePlan()
  const missed = my.grammarWrong ?? {}
  const gs = grammarState(my, lv)
  const studied = grammarDays(lv).filter((_, i) => gs.passed.includes(i + 1)).flat()

  const items = useMemo(() => {
    const wrongFirst = plan.review === 'mistake-first' || plan.review === 'mixed'
    const isWrong = (g) => !!missed[`${lv}:${g.p}`]
    const tiers = wrongFirst ? [studied.filter(isWrong), studied.filter(g => !isWrong(g))] : [studied]
    return tiers.flatMap(shuffle).slice(0, plan.quizSize)
  }, [lv, round, studied.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <LevelTabs value={lv} onChange={l => { setLv(l); setRound(r => r + 1) }} />
      {items.length ? (
        <GrammarTest key={`${lv}-${round}`} lv={lv} items={items} label={`${lv} 문법 퀴즈`}
          actions={() => <button className="nb-btn" onClick={() => setRound(r => r + 1)}>다시 풀기 🔄</button>} />
      ) : (
        <div className="nb-empty">문법 탭에서 {lv} 문법 Day를 하나 끝내면<br />배운 문법으로 퀴즈를 풀 수 있어요.</div>
      )}
    </>
  )
}

export default function JlptPage() {
  const [tab, setTab] = useState(TABS[0])
  return (
    <div className="screen nb">
      <NbHeader title="JLPT 공부" />
      <div className="scroll">
        <div className="nb-tabs">
          {TABS.map(t => <button key={t} className={`nb-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        {tab === '시험 안내' && <ExamInfo />}
        {tab === '문제 유형' && <Types />}
        {tab === '문법' && <Grammar />}
        {tab === '문법 퀴즈' && <GrammarQuiz />}
        <div style={{ height: 20 }} />
      </div>
      <BottomNav />
    </div>
  )
}
