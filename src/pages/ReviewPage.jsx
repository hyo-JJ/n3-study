import { useNavigate } from 'react-router-dom'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { LEVELS } from '../lib/data'
import { dueDays } from '../lib/study'
import { KANJI_LV } from '../lib/kanji'
import { REVIEW } from '../lib/studyStyle'
import { Pic } from '../components/Icons'

const REVIEW_NAME = { spaced: '간격 반복형', 'mistake-first': '오답 우선형', cumulative: '누적 복습형', mixed: '혼합형' }

// 복습 공간 — 학습 프로필의 복습 방식에 맞춰 순서와 추천이 달라짐
export default function ReviewPage() {
  const navigate = useNavigate()
  const { getLevel } = useProgress()
  const plan = usePlan()
  const levels = Object.keys(LEVELS)
  const wrong = levels.reduce((s, l) => s + getLevel(l).wrongWords.length, 0)
  const passed = levels.reduce((s, l) => s + getLevel(l).passedDays.length, 0)
  const kanjiWrong = getLevel(KANJI_LV).wrongWords.length
  const due = levels.flatMap(l => dueDays(getLevel(l)).map(d => ({ level: l, d })))

  const rows = {
    wrong: { to: '/wrong', ico: 'checklist', c: 'var(--nb-pink)', t: '오답노트', s: '테스트·게임에서 틀린 단어만 모아서 다시', chip: `${wrong}개` },
    weekend: { to: '/weekend', ico: 'calendar', c: 'var(--nb-beige)', t: '누적 복습', s: '최근에 끝낸 Day를 다시 보고 범위 테스트', chip: `완료 ${passed} Day` },
    kanji: { to: '/kanji/wrong', ico: 'pencil', c: 'var(--nb-lime)', t: '틀린 한자', s: '상용한자 테스트에서 틀린 한자 다시', chip: `${kanjiWrong}자` },
  }
  const order = plan.review === 'mistake-first' ? ['wrong', 'kanji', 'weekend']
    : plan.review === 'cumulative' ? ['weekend', 'wrong', 'kanji']
    : ['wrong', 'weekend', 'kanji']
  const spacedFirst = plan.review === 'spaced' || plan.review === 'mixed'

  const dueBlock = (
    <>
      <h2 className="nb-h" style={spacedFirst ? { marginTop: 0 } : undefined}>📅 오늘의 간격 복습</h2>
      {due.length ? (
        <div className="nb-list">
          {due.map(({ level, d }) => (
            <button key={`${level}-${d}`} className="nb-card nb-row" style={{ marginTop: 0 }} onClick={() => navigate(`/learn/${level}/${d}/flash`)}>
              <span className="grow"><div className="t">{level} Day {d} · {LEVELS[level].days[d - 1]?.topic}</div><div className="s">잊어버리기 전에 한 번 더 — {LEVELS[level].days[d - 1]?.words.length}단어</div></span>
              <span className="nb-chip" style={{ '--c': 'var(--nb-sky)' }}>복습</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="nb-p">오늘 간격이 돌아온 Day는 없어요. 통과한 지 1·3·7·14·30일째인 Day가 여기에 떠요.</p>
      )}
    </>
  )

  return (
    <div className="screen nb">
      <NbHeader title="복습" />
      <div className="scroll">
        <div className="nb-card" style={{ marginBottom: 18 }}>
          <span className="nb-chip" style={{ '--c': 'var(--nb-sky)' }}>나의 복습 방식 · {REVIEW_NAME[plan.review]}</span>
          <p className="nb-p" style={{ marginTop: 8 }}>{REVIEW[plan.review]}</p>
        </div>

        {spacedFirst && dueBlock}
        <h2 className="nb-h" style={spacedFirst ? undefined : { marginTop: 0 }}>복습하기</h2>
        <div className="nb-list">
          {order.map(k => rows[k]).filter(it => it.to !== '/kanji/wrong' || kanjiWrong).map(it => (
            <button key={it.to} className="nb-card nb-row" style={{ marginTop: 0 }} onClick={() => navigate(it.to)}>
              <span className="nb-ico pic-box"><Pic name={it.ico} /></span>
              <span className="grow"><div className="t">{it.t}</div><div className="s">{it.s}</div></span>
              <span className="nb-chip" style={{ '--c': it.c }}>{it.chip}</span>
            </button>
          ))}
        </div>
        {!spacedFirst && dueBlock}
      </div>
      <BottomNav />
    </div>
  )
}
