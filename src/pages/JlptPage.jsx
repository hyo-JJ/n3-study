import { useMemo, useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { useActiveLevel } from '../hooks/useActiveLevel'
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

      <h3 className="nb-h">📅 시험 일정</h3>
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

function Grammar() {
  const [lv, setLv] = useGrammarLevel()
  const [q, setQ] = useState('')
  const list = GRAMMAR[lv].filter(g => !q || (g.p + g.m + g.ex + g.ko).includes(q.trim()))
  return (
    <>
      <LevelTabs value={lv} onChange={setLv} />
      <input className="nb-input" placeholder="문법·뜻으로 찾기 (예: 때문에, ように)" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 14 }} />
      <div className="nb-list">
        {list.map(g => (
          <div key={g.p} className="nb-card gm" style={{ marginTop: 0 }}>
            <div className="gm-p">{g.p}</div>
            <div className="gm-m">{g.m}</div>
            <div className="gm-c">접속: {g.c}</div>
            <div className="gm-ex">
              <div className="jp"><Example ex={g.ex} /></div>
              <div className="gm-ko">{g.ko}</div>
            </div>
          </div>
        ))}
        {!list.length && <div className="nb-empty">찾는 문법이 없어요.</div>}
      </div>
    </>
  )
}

const QUIZ_N = 10

function GrammarQuiz() {
  const [lv, setLv] = useGrammarLevel()
  const [round, setRound] = useState(0)
  const qs = useMemo(() => {
    const pool = GRAMMAR[lv]
    return shuffle(pool).slice(0, QUIZ_N).map(g => {
      const ans = answerOf(g)
      const others = shuffle(pool.filter(x => answerOf(x) !== ans)).slice(0, 3).map(answerOf)
      return { g, ans, opts: shuffle([ans, ...others]) }
    })
  }, [lv, round])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)

  const restart = (l = lv) => { setLv(l); setRound(r => r + 1); setIdx(0); setPicked(null); setScore(0) }

  if (idx >= qs.length) {
    return (
      <>
        <div className="nb-card nb-q">
          <div className="big">{score} / {qs.length}</div>
          <div className="hint">{score >= 8 ? '훌륭해요! 🎉' : score >= 5 ? '좋아요, 틀린 문법만 다시 보면 완벽! 💪' : '문법 탭에서 한 번 더 읽어보고 도전해요 📖'}</div>
        </div>
        <div className="gap" />
        <button className="nb-btn" onClick={() => restart()}>다시 풀기 🔄</button>
      </>
    )
  }

  const { g, ans, opts } = qs[idx]
  const pick = (o) => { if (picked) return; setPicked(o); if (o === ans) setScore(s => s + 1) }
  return (
    <>
      <LevelTabs value={lv} onChange={l => restart(l)} />
      <div className="nb-hud"><span>{idx + 1} / {qs.length}</span><span>정답 {score}</span></div>
      <div className="nb-bar"><i style={{ width: `${(idx + 1) / qs.length * 100}%` }} /></div>
      <div className="nb-card nb-q" style={{ marginTop: 12 }}>
        <div className="sent"><Example ex={g.ex} blank={picked ? ans : true} /></div>
        <div className="hint">{g.ko}</div>
      </div>
      <div className="nb-opts">
        {opts.map(o => {
          let c = 'nb-opt jp'
          if (picked) c += o === ans ? ' ok' : o === picked ? ' no' : ' dim'
          return <button key={o} className={c} onClick={() => pick(o)}>{o}</button>
        })}
      </div>
      {picked && (
        <>
          <div className="nb-card" style={{ marginTop: 16 }}>
            <b className="jp">{g.p}</b> — {g.m}
            <div className="gm-c">접속: {g.c}</div>
          </div>
          <div className="gap" />
          <button className="nb-btn" onClick={() => { setIdx(i => i + 1); setPicked(null) }}>{idx === qs.length - 1 ? '결과 보기' : '다음 →'}</button>
        </>
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
