import { useMemo, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { Pic } from '../components/Icons'
import { useActiveLevel } from '../hooks/useActiveLevel'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import TestRunner from '../components/learn/TestRunner'
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

function useGrammarLevel() {
  const [lv] = useActiveLevel()
  return useState(GL.includes(lv) ? lv : 'N3')
}

function LevelTabs({ value, onChange }) {
  return (
    <div className="nb-tabs">
      {GL.map(l => <button key={l} className={`nb-tab${value === l ? ' on' : ''}`} onClick={() => onChange(l)}>{l} · {GRAMMAR[l].length}</button>)}
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

// 외운 문법 체크 — 나만의 기록(MY)에 레벨:문법 키로 저장
function useGrammarDone() {
  const { my, updateMy } = useProgress()
  const done = my.grammarDone ?? {}
  const toggle = (lv, p) => updateMy(m => {
    const next = { ...(m.grammarDone ?? {}) }
    if (next[`${lv}:${p}`]) delete next[`${lv}:${p}`]; else next[`${lv}:${p}`] = 1
    return { ...m, grammarDone: next }
  })
  return [(lv, p) => !!done[`${lv}:${p}`], toggle]
}

function Grammar({ onQuiz }) {
  const plan = usePlan()
  const [lv, setLv] = useGrammarLevel()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('전체')
  const [onlyTodo, setOnlyTodo] = useState(false)
  const [open, setOpen] = useState(null)
  // 목록형(텍스트)은 설명·예문을 처음부터 다 펼쳐서
  const [expandAll, setExpandAll] = useState(plan.screen === 'textual')
  const [isDone, toggleDone] = useGrammarDone()

  const all = GRAMMAR[lv]
  const cats = [...new Set(all.map(g => g.cat).filter(Boolean))]
  const doneCount = all.filter(g => isDone(lv, g.p)).length
  const list = all.filter(g =>
    (cat === '전체' || g.cat === cat) &&
    (!onlyTodo || !isDone(lv, g.p)) &&
    (!q || [g.p, g.m, g.c, g.d, g.ex, g.ko].join(' ').includes(q.trim())))
  const changeLv = (l) => { setLv(l); setCat('전체'); setOpen(null) }

  return (
    <>
      <LevelTabs value={lv} onChange={changeLv} />
      <div className="nb-card" style={{ marginBottom: 14, padding: 12 }}>
        <div className="nb-hud" style={{ marginBottom: 0 }}><span>외운 문법</span><span>{doneCount} / {all.length}</span></div>
        <div className="nb-bar"><i style={{ width: `${doneCount / all.length * 100}%` }} /></div>
        <p className="nb-p" style={{ fontSize: 12 }}>문법을 눌러 설명·예문을 보고, 다 외웠으면 ✓ 를 눌러요.</p>
      </div>
      {plan.screen === 'pragmatic' && (
        <button className="nb-card nb-row" style={{ marginBottom: 14, background: 'var(--nb-yellow)', color: '#111' }} onClick={onQuiz}>
          <span className="grow"><div className="t">🎯 문제부터 풀어볼까요?</div><div className="s" style={{ color: '#333' }}>퀴즈형은 먼저 풀고 틀린 문법만 읽는 게 잘 맞아요</div></span>
          <span style={{ fontSize: 20, fontWeight: 900 }}>→</span>
        </button>
      )}
      <input className="nb-input" placeholder="문법·뜻으로 찾기 (예: 때문에, ように)" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="nb-tabs" style={{ marginBottom: 10 }}>
        <button className={`nb-tab${onlyTodo ? ' on' : ''}`} onClick={() => setOnlyTodo(v => !v)}>안 외운 것만</button>
        <button className={`nb-tab${expandAll ? ' on' : ''}`} onClick={() => setExpandAll(v => !v)}>모두 펼치기</button>
        {cats.length > 1 && ['전체', ...cats].map(c => <button key={c} className={`nb-tab${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="nb-list">
        {list.map(g => {
          const done = isDone(lv, g.p)
          const isOpen = expandAll || open === g.p || !!q.trim()
          return (
            <div key={g.p} className={`nb-card gm${done ? ' done' : ''}`} style={{ marginTop: 0 }}>
              <div className="gm-top">
                <button className="gm-head" onClick={() => setOpen(isOpen && open === g.p ? null : g.p)}>
                  <div className="gm-p">{g.p}</div>
                  <div className="gm-m">{g.m}</div>
                </button>
                <button className={`gm-check${done ? ' on' : ''}`} onClick={() => toggleDone(lv, g.p)} aria-label="외웠어요">✓</button>
              </div>
              {isOpen && (
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
        })}
        {!list.length && <div className="nb-empty">{onlyTodo && !q ? '이 분류는 다 외웠어요! 🎉' : '찾는 문법이 없어요.'}</div>}
      </div>
    </>
  )
}

// 문법 퀴즈 — 문제 수는 학습 호흡, 피드백은 프로필 방식, 오답 우선형이면 틀렸던 문법부터
function GrammarQuiz() {
  const [lv, setLv] = useGrammarLevel()
  const [round, setRound] = useState(0)
  const [isDone] = useGrammarDone()
  const { my, updateMy } = useProgress()
  const plan = usePlan()
  const record = useRecord()
  const [result, setResult] = useState(null)
  const missed = my.grammarWrong ?? {}

  const qs = useMemo(() => {
    const pool = GRAMMAR[lv]
    const wrongFirst = plan.review === 'mistake-first' || plan.review === 'mixed'
    const isWrong = (g) => !!missed[`${lv}:${g.p}`]
    // 오답 우선형: 틀렸던 문법 → 안 외운 문법 → 외운 문법 / 그 밖: 안 외운 문법 → 외운 문법
    const tiers = wrongFirst
      ? [pool.filter(isWrong), pool.filter(g => !isWrong(g) && !isDone(lv, g.p)), pool.filter(g => !isWrong(g) && isDone(lv, g.p))]
      : [pool.filter(g => !isDone(lv, g.p)), pool.filter(g => isDone(lv, g.p))]
    const picks = tiers.flatMap(shuffle).slice(0, plan.quizSize)
    return shuffle(picks).map(g => {
      const ans = answerOf(g)
      const others = shuffle(pool.filter(x => answerOf(x) !== ans)).slice(0, 3).map(answerOf)
      return {
        key: g.p, g, answer: ans, jp: true, hint: g.ko, missQ: g.ex.replace(/【.+?】/, '（　）'),
        opts: shuffle([ans, ...others]),
        q: (answered) => <div className="sent"><Example ex={g.ex} blank={answered ? ans : true} /></div>,
        after: <><b className="jp">{g.p}</b> — {g.m}<div className="gm-c">접속: {g.c}</div>{g.d && <p className="gm-d">{g.d}</p>}</>,
      }
    })
  }, [lv, round]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = (l = lv) => { setLv(l); setRound(r => r + 1); setResult(null) }

  // 틀린 문법은 기록해 두고(오답 우선형이 먼저 풀도록), 맞히면 지움
  const onAnswer = (q, ok) => updateMy(m => {
    const next = { ...(m.grammarWrong ?? {}) }
    if (ok) delete next[`${lv}:${q.g.p}`]; else next[`${lv}:${q.g.p}`] = 1
    return { ...m, grammarWrong: next }
  })
  const onDone = (r) => {
    setResult(r)
    record({ kind: 'grammar', label: `${lv} 문법 퀴즈`, correct: r.correct, total: r.total })
  }

  if (result) {
    const pct = result.correct / result.total
    return (
      <>
        <div className="nb-card nb-q">
          <div className="big">{result.correct} / {result.total}</div>
          <div className="hint">{pct >= .8 ? '훌륭해요! 🎉' : pct >= .5 ? '좋아요, 틀린 문법만 다시 보면 완벽! 💪' : '문법 탭에서 한 번 더 읽어보고 도전해요 📖'}</div>
        </div>
        {plan.feedback === 'delayed' && result.misses.length > 0 && (
          <div className="nb-card">
            <b>틀린 문제 {result.misses.length}개</b>
            {result.misses.map((m, i) => <p key={i} className="nb-p" style={{ marginTop: 8 }}><span className="jp">{m.q}</span><br />정답 <b className="jp">{m.a}</b> · 내 답 <s className="jp">{m.picked}</s></p>)}
          </div>
        )}
        <div className="gap" />
        <button className="nb-btn" onClick={() => restart()}>다시 풀기 🔄</button>
      </>
    )
  }

  return (
    <>
      <LevelTabs value={lv} onChange={l => restart(l)} />
      <TestRunner key={`${lv}-${round}`} questions={qs} feedback={plan.feedback} variant="nb" onAnswer={onAnswer} onDone={onDone} />
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
        {tab === '문법' && <Grammar onQuiz={() => setTab('문법 퀴즈')} />}
        {tab === '문법 퀴즈' && <GrammarQuiz />}
        <div style={{ height: 20 }} />
      </div>
      <BottomNav />
    </div>
  )
}
