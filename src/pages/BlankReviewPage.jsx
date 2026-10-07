import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { usePlan } from '../hooks/useStudyStyle'
import { useRecord } from '../hooks/useRecord'
import { BreakCard, MissList } from '../components/learn/Session'
import { useToast } from '../components/Toast'
import { levelHome } from '../lib/study'
import { getDay } from '../lib/data'
import { isDaily } from '../lib/level'
import Furigana from '../components/Furigana'

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 가타카나 → 히라가나, 공백 제거
const normKana = (s) => s.replace(/\s/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
const normText = (s) => s.replace(/[\s.。·・~〜!?]/g, '')
const stripHada = (s) => s.replace(/하다$/, '')

// "주인, 남편" / "누나/언니" / "격조함(오랜만)" → 각각을 정답 후보로
const meaningOk = (input, meaning) => {
  const v = normText(input)
  if (!v) return false
  const cands = [meaning, ...meaning.split(/[\/,，()（）]/)].map(normText).filter(Boolean)
  return cands.some(c => c === v || stripHada(c) === stripHada(v))
}

export default function BlankReviewPage() {
  const { level, day } = useParams()
  const dayNum = Number(day)
  const dayData = getDay(level, dayNum)
  const navigate = useNavigate()
  const toast = useToast()
  const { getLevel, update } = useProgress()
  const plan = usePlan()
  const record = useRecord()
  const words = dayData?.words ?? []
  const total = words.length

  // 세트(학습 호흡)마다: 1라운드 뜻 → 요미카타 + 한자 쓰기 / 2라운드 한자 → 뜻 쓰기
  // 세트를 끝낼 때마다 저장하므로 중간에 그만둬도 다음 세트부터 이어서
  const size = plan.chunk || total
  const saved = getLevel(level).blankProgress[dayNum] || 0
  const [from, setFrom] = useState(saved < total ? Math.floor(saved / size) * size : 0)
  const to = Math.min(from + size, total)
  const steps = useMemo(() => {
    const part = words.slice(from, to)
    return [
      ...shuffle(part).map(w => ({ w, type: 'write' })),
      ...shuffle(part).map(w => ({ w, type: 'meaning' })),
    ]
  }, [dayData, from]) // eslint-disable-line react-hooks/exhaustive-deps

  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState({ reading: '', word: '', meaning: '' })
  const [result, setResult] = useState(null) // { ok, readingOk, wordOk }
  const [misses, setMisses] = useState([])
  const [pause, setPause] = useState(null) // 'misses' | 'break'
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!dayData) return null
  const { w: word, type } = steps[idx]
  const half = steps.length / 2
  const isWrite = type === 'write'
  const kanaOnly = !word.reading // 가나로만 된 단어는 입력칸 하나

  const set = (k) => (e) => setInput(v => ({ ...v, [k]: e.target.value }))

  const check = () => {
    if (result) { next(result.ok); return }
    let r
    if (isWrite) {
      // "早い/速い"처럼 표기가 여러 개면 하나만 맞아도 정답
      const wordOk = word.word.split('/').some(w => kanaOnly
        ? normKana(input.word) === normKana(w)
        : input.word.replace(/\s/g, '') === w)
      const readingOk = kanaOnly || normKana(input.reading) === normKana(word.reading)
      r = { ok: wordOk && readingOk, readingOk, wordOk }
    } else {
      r = { ok: meaningOk(input.meaning, word.meaning) }
    }
    // 피드백 방식 — delayed: 공개하지 않고 다음으로(세트 끝에 모아서) / adaptive: 맞으면 잠깐 보여주고 다음
    if (plan.feedback === 'delayed') {
      if (!r.ok) setMisses(m => [...m, isWrite
        ? { q: word.meaning, a: word.reading ? `${word.word}（${word.reading}）` : word.word, picked: [input.reading, input.word].filter(Boolean).join(' / ') }
        : { q: word.word, a: word.meaning, picked: input.meaning }])
      next(r.ok)
      return
    }
    setResult(r)
    if (r.ok && plan.feedback === 'adaptive') timer.current = setTimeout(() => next(true), 650)
  }

  const finishSet = () => {
    update(level, st => ({ ...st, blankProgress: { ...st.blankProgress, [dayNum]: Math.max(to, st.blankProgress[dayNum] || 0) } }))
    if (to < total) { setPause('break'); return }
    record()
    toast('백지 복습 완료! 🎉')
    setTimeout(() => {
      const when = isDaily(level) ? '내일 ' : ''
      if (confirm(`Day ${dayNum} 학습 완료!\n누적 테스트를 통과하면 ${when}다음 Day가 열립니다.\n지금 시작할까요?`)) {
        navigate(`/quiz/${level}/${dayNum}`)
      } else {
        navigate(levelHome(level))
      }
    }, 500)
  }

  const next = (correct) => {
    clearTimeout(timer.current)
    if (!correct) {
      update(level, st => {
        const already = st.wrongWords.some(w => w.dn === dayNum && w.no === word.no)
        if (already) return st
        return { ...st, wrongWords: [...st.wrongWords, { dn: dayNum, no: word.no, word: word.word, meaning: word.meaning }] }
      })
    }
    setInput({ reading: '', word: '', meaning: '' })
    setResult(null)
    const nextIdx = idx + 1
    if (nextIdx >= steps.length) {
      // delayed는 세트 끝에서 틀린 것 모아 보기 (방금 틀린 것까지 반영되도록 다음 렌더에서 판단)
      if (plan.feedback === 'delayed') setPause('misses')
      else finishSet()
      return
    }
    if (nextIdx === half) toast('2라운드: 한자를 보고 뜻을 써보세요 ✍️')
    setIdx(nextIdx)
  }

  const nextSet = () => { setFrom(to); setIdx(0); setMisses([]); setPause(null) }

  // 한글/일본어 IME 변환 중 Enter는 무시
  const onKey = (e) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    check()
  }

  const exitConfirm = () => {
    if (confirm(total > size ? '학습을 중단할까요?\n(끝낸 세트까지 저장돼요)' : '학습을 중단할까요?\n(백지 복습은 처음부터 다시 시작해요)')) navigate(levelHome(level))
  }

  const canCheck = isWrite
    ? input.word.trim() && (kanaOnly || input.reading.trim())
    : input.meaning.trim()

  const inputProps = { onKeyDown: onKey, readOnly: !!result, autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false }
  const mark = (ok) => result && <span style={{ marginLeft: 6, color: ok ? 'var(--ok)' : 'var(--err)' }}>{ok ? '✓' : '✗'}</span>

  if (pause) {
    return (
      <div className="screen">
        <Topbar title={`Day ${dayNum} 백지 복습`} onBack={exitConfirm} />
        <div className="fc-wrap">
          {pause === 'misses' ? (
            <>
              {misses.length ? <MissList misses={misses} /> : <div className="result-card"><div className="r-score" style={{ fontSize: 52 }}>💯</div><div className="r-msg">이번 세트는 다 맞혔어요!</div></div>}
              <button className="btn btn-accent" onClick={() => { setPause(null); finishSet() }}>확인했어요 →</button>
            </>
          ) : (
            <BreakCard done={to} total={total} chunk={size} onContinue={nextSet} onStop={() => navigate(levelHome(level))} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} 백지 복습`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{(idx % half) + 1} / {half}{total > size ? ` · ${from / size + 1}/${Math.ceil(total / size)}세트` : ''}</span>
          <span className="phase-badge">② 백지 복습 · {isWrite ? '1라운드 쓰기' : '2라운드 뜻'}</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / steps.length * 100).toFixed(0)}%` }} /></div>

        <div className="blank-card" style={{ minHeight: 160 }}>
          <div className="blank-prompt">
            {isWrite
              ? (kanaOnly ? '뜻을 보고 → 일본어를 써보세요' : '뜻을 보고 → 읽는 법과 한자를 써보세요')
              : '한자를 보고 → 뜻을 써보세요'}
          </div>
          <div className={`blank-show${isWrite ? '' : ' jp'}`}>{isWrite ? word.meaning : word.word}</div>
          {result && (
            <div className="blank-ans" style={{ color: result.ok ? 'var(--ok)' : 'var(--err)' }}>
              {isWrite ? (
                <span className="jp"><Furigana word={word.word} reading={word.reading} /></span>
              ) : (
                <>{word.meaning}{word.reading && <span className="jp" style={{ fontSize: 16, marginLeft: 8, color: 'var(--label3)' }}>{word.reading}</span>}</>
              )}
            </div>
          )}
        </div>

        {isWrite ? (
          <>
            {!kanaOnly && (
              <div className="fld">
                <label>읽는 법 (요미카타){mark(result?.readingOk)}</label>
                <input key={`r${idx}`} className="jp" lang="ja" placeholder="ひらがな" value={input.reading} onChange={set('reading')} autoFocus {...inputProps} />
              </div>
            )}
            <div className="fld">
              <label>{kanaOnly ? '일본어' : '한자'}{mark(result?.wordOk)}</label>
              <input key={`w${idx}`} className="jp" lang="ja" placeholder={kanaOnly ? 'かな' : '漢字'} value={input.word} onChange={set('word')} autoFocus={kanaOnly} {...inputProps} />
            </div>
          </>
        ) : (
          <div className="fld">
            <label>뜻{mark(result?.ok)}</label>
            <input key={`m${idx}`} lang="ko" placeholder="뜻 입력" value={input.meaning} onChange={set('meaning')} autoFocus {...inputProps} />
          </div>
        )}

        {!result ? (
          <button className="btn btn-accent" onClick={check} disabled={!canCheck}>정답 확인</button>
        ) : result.ok ? (
          plan.feedback === 'adaptive' ? <button className="btn btn-ok" disabled>정답! ✓</button>
            : <button className="btn btn-ok" onClick={() => next(true)}>정답! 다음 →</button>
        ) : (
          <button className="btn btn-accent" onClick={() => next(false)}>다음 →</button>
        )}
      </div>
    </div>
  )
}
