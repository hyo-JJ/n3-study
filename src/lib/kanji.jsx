// 상용한자 2,136자 — 가나다(음) 순서로 20자씩 세트
// 데이터가 커서(약 1MB) 한자 화면을 열 때만 불러옴
import { useEffect, useState } from 'react'

export const KANJI_LV = 'KANJI' // 진행 기록 행 이름 (passedDays = 통과한 세트, flashProgress = 세트별 익힌 수, wrongWords = 틀린 한자)
export const SET = 20
export const KANJI_COUNT = 2136 // 데이터를 불러오기 전에도 홈·마이페이지에 보여줄 수
export const KANJI_SETS = Math.ceil(KANJI_COUNT / SET)

let cache = null
let loading = null
const load = () => (loading ??= import('./data/joyo.json').then(m => {
  const all = m.default
  const sets = []
  for (let i = 0; i < all.length; i += SET) {
    const list = all.slice(i, i + SET)
    sets.push({ n: sets.length + 1, list, title: `${list[0].hangul}~${list[list.length - 1].hangul}`, initials: [...new Set(list.map(k => k.initial))] })
  }
  cache = { all, sets, byId: new Map(all.map(k => [k.id, k])) }
  return cache
}))

export function useKanji() {
  const [data, setData] = useState(cache)
  useEffect(() => { if (!cache) load().then(setData) }, [])
  return data
}

export const hunEum = (k) => `${k.meaning} ${k.hangul}` // 훈음 (예: 집 가)

export function KanjiDetail({ k }) {
  return (
    <div className="kj-detail">
      {k.on.length > 0 && <div><span className="kj-tag">음독</span><span className="jp">{k.on.join('・')}</span></div>}
      {k.kun.length > 0 && <div><span className="kj-tag">훈독</span><span className="jp">{k.kun.join('・')}</span></div>}
      <div className="kj-words">
        {k.words.map((w, i) => (
          <span key={i} className="kj-word"><b className="jp">{w.word}</b><span className="jp">{w.reading}</span>{w.meaning}</span>
        ))}
      </div>
    </div>
  )
}

export const kanjiItem = (k) => ({ key: k.id, word: k.kanji, meaning: hunEum(k), writable: true, detail: <KanjiDetail k={k} /> })
