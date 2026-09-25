import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import { levelHome } from '../lib/study'
import { getDay, LEVELS } from '../lib/data'
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
  const { update } = useProgress()

  // 1라운드: 뜻 → 요미카타 + 한자 쓰기 / 2라운드: 한자 → 뜻 쓰기
  const steps = useMemo(() => {
    const words = dayData?.words ?? []
    return [
      ...shuffle(words).map(w => ({ w, type: 'write' })),
      ...shuffle(words).map(w => ({ w, type: 'meaning' })),
    ]
  }, [dayData])

  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState({ reading: '', word: '', meaning: '' })
  const [result, setResult] = useState(null) // { ok, readingOk, wordOk }

  if (!dayData) return null
  const { w: word, type } = steps[idx]
  const total = steps.length
  const half = total / 2
  const isWrite = type === 'write'
  const kanaOnly = !word.reading // 가나로만 된 단어는 입력칸 하나

  const set = (k) => (e) => setInput(v => ({ ...v, [k]: e.target.value }))

  const check = () => {
    if (result) { next(result.ok); return }
    if (isWrite) {
      // "早い/速い"처럼 표기가 여러 개면 하나만 맞아도 정답
      const wordOk = word.word.split('/').some(w => kanaOnly
        ? normKana(input.word) === normKana(w)
        : input.word.replace(/\s/g, '') === w)
      const readingOk = kanaOnly || normKana(input.reading) === normKana(word.reading)
      setResult({ ok: wordOk && readingOk, readingOk, wordOk })
    } else {
      setResult({ ok: meaningOk(input.meaning, word.meaning) })
    }
  }

  const next = (correct) => {
    if (!correct) {
      update(level, st => {
        const already = st.wrongWords.some(w => w.dn === dayNum && w.no === word.no)
        if (already) return st
        return { ...st, wrongWords: [...st.wrongWords, { dn: dayNum, no: word.no, word: word.word, meaning: word.meaning }] }
      })
    }
    const nextIdx = idx + 1
    if (nextIdx >= total) {
      update(level, st => ({ ...st, blankProgress: { ...st.blankProgress, [dayNum]: dayData.words.length } }))
      toast('백지 복습 완료! 🎉')
      setTimeout(() => {
        const when = LEVELS[level]?.dailyLimit ? '내일 ' : ''
        if (confirm(`Day ${dayNum} 학습 완료!\n누적 테스트를 통과하면 ${when}다음 Day가 열립니다.\n지금 시작할까요?`)) {
          navigate(`/quiz/${level}/${dayNum}`)
        } else {
          navigate(levelHome(level))
        }
      }, 500)
      return
    }
    if (nextIdx === half) toast('2라운드: 한자를 보고 뜻을 써보세요 ✍️')
    setIdx(nextIdx)
    setInput({ reading: '', word: '', meaning: '' })
    setResult(null)
  }

  // 한글/일본어 IME 변환 중 Enter는 무시
  const onKey = (e) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    check()
  }

  const exitConfirm = () => {
    if (confirm('학습을 중단할까요?\n(백지 복습은 처음부터 다시 시작해요)')) navigate(levelHome(level))
  }

  const canCheck = isWrite
    ? input.word.trim() && (kanaOnly || input.reading.trim())
    : input.meaning.trim()

  const inputProps = { onKeyDown: onKey, readOnly: !!result, autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false }
  const mark = (ok) => result && <span style={{ marginLeft: 6, color: ok ? 'var(--ok)' : 'var(--err)' }}>{ok ? '✓' : '✗'}</span>

  return (
    <div className="screen">
      <Topbar title={`Day ${dayNum} 백지 복습`} onBack={exitConfirm} />
      <div className="fc-wrap">
        <div className="fc-meta">
          <span className="fc-cnt">{(idx % half) + 1} / {half}</span>
          <span className="phase-badge">② 백지 복습 · {isWrite ? '1라운드 쓰기' : '2라운드 뜻'}</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${((idx + 1) / total * 100).toFixed(0)}%` }} /></div>

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
          <button className="btn btn-ok" onClick={() => next(true)}>정답! 다음 →</button>
        ) : (
          <button className="btn btn-accent" onClick={() => next(false)}>다음 →</button>
        )}
      </div>
    </div>
  )
}
