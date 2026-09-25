// 단어를 [{ text, rt }] 조각으로 나눠 한자 위에만 읽는 법을 붙인다.
// 예) お互い / おたがい → [お] [互:たが] [い]
//     挨拶 / あいさつ → [挨拶:あいさつ] (숙어는 글자별로 나눌 수 없어 통째로)
const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/
const toHira = (s) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function splitFurigana(word, reading) {
  if (!reading || !KANJI.test(word)) return [{ text: word }]
  // "早い/速い"처럼 표기가 여러 개면 각각 나눠서 처리
  if (word.includes('/')) return word.split('/').flatMap((w, i) => [...(i ? [{ text: '/' }] : []), ...splitFurigana(w, reading)])
  const runs = word.match(/[㐀-鿿豈-﫿々〆ヶ]+|[^㐀-鿿豈-﫿々〆ヶ]+/g) ?? []
  const re = new RegExp('^' + runs.map(r => KANJI.test(r) ? '(.+?)' : `(${esc(toHira(r))})`).join('') + '$')
  const m = toHira(reading).match(re)
  if (!m) return [{ text: word, rt: reading }]
  return runs.map((r, i) => KANJI.test(r) ? { text: r, rt: m[i + 1] } : { text: r })
}
