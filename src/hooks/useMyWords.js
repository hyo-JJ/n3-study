import { useProgress } from './useProgress'
import { useToast } from '../components/Toast'

// 나만의 단어장에 담기·빼기 — 익히기 화면에서 씀 (from: 어디서 담았는지 표시용, 예 'N3 Day 4')
export function useMyWords(from) {
  const { my, updateMy } = useProgress()
  const toast = useToast()
  const isSaved = (item) => my.words.some(w => w.word === item.word)
  const toggle = (item) => {
    if (isSaved(item)) {
      updateMy(m => ({ ...m, words: m.words.filter(w => w.word !== item.word) }))
      toast('단어장에서 뺐어요')
    } else {
      const w = { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), word: item.word, reading: item.reading ?? '', meaning: item.meaning, memo: '', from }
      updateMy(m => ({ ...m, words: [w, ...m.words] }))
      toast('나만의 단어장에 담았어요 💜')
    }
  }
  return { isSaved, toggle }
}
