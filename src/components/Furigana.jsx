import { splitFurigana } from '../lib/furigana'

// 한자 바로 위에 읽는 법(ruby)을 표시
export default function Furigana({ word, reading, show = true }) {
  return splitFurigana(word, reading).map((p, i) =>
    p.rt ? <ruby key={i}>{p.text}<rt style={{ visibility: show ? 'visible' : 'hidden' }}>{p.rt}</rt></ruby> : <span key={i}>{p.text}</span>
  )
}
