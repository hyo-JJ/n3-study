// 요미카타(읽는 법) 문제 보기 만들기 — JLPT 한자 읽기처럼 장음·촉음·탁음을 살짝 바꾼 가짜 읽기를 섞는다

const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

// 데이터의 읽기 정리 — 'あした/あす' 처럼 여러 개면 첫 번째, '～' 는 빼기
export const cleanReading = (r) => (r ?? '').split('/')[0].replace(/[～〜]/g, '').trim()

const VOICE = {}
for (const [a, b] of ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つづ', 'てで', 'とど', 'はば', 'ひび', 'ふぶ', 'へべ', 'ほぼ', 'ぱば', 'ぴび', 'ぷぶ', 'ぺべ', 'ぽぼ']) {
  (VOICE[a] ??= []).push(b);
  (VOICE[b] ??= []).push(a)
}
const SMALL = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' }
const O_U = 'おこごそぞとどのほぼぽもよょろうくぐすずつづぬふぶぷむゆゅる' // 뒤에 う가 붙으면 장음
const E = 'えけげせぜてでねへべぺめれ' // 뒤에 い가 붙으면 장음
const O = 'おこごそぞとどのほぼぽもよょろ'
const GEMINATE = 'かきくけこさしすせそたちつてとぱぴぷぺぽ' // 앞에 っ가 올 수 있는 글자
const CUT = 'くつちき' // 뒤 글자와 만나 っ로 줄어드는 글자 (がくこう → がっこう)

// 한 군데만 바꾼 가짜 읽기들 — 장음 빼기/넣기, っ ↔ く·つ, 탁음·반탁음 바꾸기(첫 글자 제외), 작은 ゃゅょ 바꾸기
export function fakeReadings(r) {
  const out = new Set()
  const at = (i, s, del = 1) => out.add(r.slice(0, i) + s + r.slice(i + del))
  for (let i = 0; i < r.length; i++) {
    const c = r[i], prev = r[i - 1]
    if (c === 'う' && prev && O_U.includes(prev)) at(i, '')
    if (c === 'い' && prev && E.includes(prev)) at(i, '')
    if (O.includes(c) && prev !== c && !'うおんっゃゅょー'.includes(r[i + 1] ?? '')) at(i + 1, 'う', 0)
    if (c === 'っ') { at(i, ''); at(i, 'く'); at(i, 'つ') }
    if (i > 0 && CUT.includes(c) && GEMINATE.includes(r[i + 1] ?? '')) at(i, 'っ')
    if (i > 0) VOICE[c]?.forEach(v => at(i, v))
    if (i > 0 && SMALL[c]) at(i, SMALL[c])
  }
  out.delete(r)
  return [...out].filter(f => !/^[っゃゅょ]|っ$/.test(f))
}

// 정답 + 가짜 읽기(최대 fakes개) + 다른 단어의 비슷한 읽기(첫 글자·글자 수가 비슷한 것 우선)로 4개, 중복 없이
export function readingOptions(raw, otherReadings, fakes = 2) {
  const right = cleanReading(raw)
  const banned = new Set((raw ?? '').split('/').map(cleanReading)) // 'あす' 처럼 이 단어의 다른 읽기는 오답으로 쓰지 않기
  const opts = new Set([right])
  for (const f of shuffle(fakeReadings(right))) {
    if (opts.size > fakes) break
    if (!banned.has(f)) opts.add(f)
  }
  const near = (r) => Math.abs(r.length - right.length) + (r[0] === right[0] ? 0 : 1)
  const real = shuffle([...new Set(otherReadings.map(cleanReading))]).sort((a, b) => near(a) - near(b))
  for (const r of real) {
    if (opts.size >= 4) break
    if (r && !banned.has(r)) opts.add(r)
  }
  return shuffle([...opts])
}
