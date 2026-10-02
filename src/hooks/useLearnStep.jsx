import { useNavigate } from 'react-router-dom'
import { useProgress } from './useProgress'
import { useStudyStyle } from './useStudyStyle'
import { useToast } from '../components/Toast'
import { levelHome } from '../lib/study'
import { CHUNK } from '../lib/studyStyle'

// ① 단어 익히기 단계 공통 — 카드형·목록형·퀴즈형이 같은 진행 기록(flashProgress)을 씀
export function useLearnStep(level, dayNum, total) {
  const navigate = useNavigate()
  const toast = useToast()
  const { getLevel, update, my, updateMy } = useProgress()
  const { style } = useStudyStyle()
  const st = getLevel(level)

  const reviewOnly = st.passedDays.includes(dayNum)
  const saved = reviewOnly ? 0 : (st.flashProgress[dayNum] || 0)
  const start = saved < total ? saved : 0
  const micro = style?.pace === 'micro'

  // n번째 단어까지 봤음 (이전으로 돌아갔다 와도 기록이 줄지 않도록)
  const saveProgress = (n) => {
    if (reviewOnly) return
    update(level, s => ({ ...s, flashProgress: { ...s.flashProgress, [dayNum]: Math.max(n, s.flashProgress[dayNum] || 0) } }))
  }

  // 마이크로형: 10단어마다 쉬어 가기
  const isBreak = (n) => micro && n < total && n % CHUNK === 0

  const finish = () => {
    if (reviewOnly) { toast('단어 복습 완료! ✅'); navigate(levelHome(level)); return }
    toast('단어 익히기 완료! 백지 복습으로 이동합니다 📝')
    setTimeout(() => navigate(`/learn/${level}/${dayNum}/blank`), 700)
  }

  const stop = () => navigate(levelHome(level))
  const exit = () => {
    if (confirm('학습을 중단할까요?\n(진행 상황은 저장됩니다)')) stop()
  }

  const isSaved = (word) => my.words.some(w => w.word === word.word)
  const toggleSave = (word) => {
    if (isSaved(word)) {
      updateMy(m => ({ ...m, words: m.words.filter(w => w.word !== word.word) }))
      toast('단어장에서 뺐어요')
    } else {
      const w = { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), word: word.word, reading: word.reading ?? '', meaning: word.meaning, memo: '', from: `${level} Day ${dayNum}` }
      updateMy(m => ({ ...m, words: [w, ...m.words] }))
      toast('나만의 단어장에 담았어요 💜')
    }
  }

  return { reviewOnly, start, micro, saveProgress, isBreak, finish, stop, exit, isSaved, toggleSave }
}

// 마이크로형 세트 사이 쉬는 화면
export function BreakCard({ done, total, onContinue, onStop }) {
  const left = Math.min(CHUNK, total - done)
  return (
    <>
      <div className="result-card">
        <div className="r-score" style={{ fontSize: 52 }}>☕</div>
        <div className="r-msg">한 세트 끝! 잘하고 있어요</div>
        <div className="r-sub">{done} / {total} 단어 · 남은 {total - done}단어</div>
      </div>
      <button className="btn btn-accent" style={{ marginBottom: 10 }} onClick={onContinue}>다음 {left}단어 이어서 →</button>
      <button className="btn btn-outline" onClick={onStop}>여기까지 하고 쉬기 (저장됨)</button>
    </>
  )
}
