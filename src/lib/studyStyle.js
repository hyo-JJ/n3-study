// 공부 성향 테스트 (Studyme PRD 3.1 온보딩을 JLPT 단어 공부에 맞게 옮김)
// pace: 학습 호흡 — micro(짧게 여러 번) / deep(한 번에 쭉)
// cognitive: 인지 선호 — visual(카드) / textual(목록) / pragmatic(퀴즈)

export const QUESTIONS = [
  {
    key: 'pace',
    tag: '학습 호흡',
    q: '평소 무언가를 배울 때, 더 좋아하는 시간 활용법은?',
    opts: [
      { v: 'deep', t: '각 잡고 앉아서 1시간 이상 푹 빠져서 파고드는 게 좋다' },
      { v: 'micro', t: '이동 시간이나 짬이 날 때 10~15분씩 짧게 치고 빠지는 게 좋다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '인지 선호 1',
    q: '처음 보는 전자기기나 새 보드게임을 시작할 때, 나의 첫 행동은?',
    opts: [
      { v: 'textual', t: '설명서를 꼼꼼히 읽으며 작동 원리부터 이해한다' },
      { v: 'visual', t: '글보다는 그림·사진 위주의 요약본이나 튜토리얼 영상을 본다' },
      { v: 'pragmatic', t: '일단 버튼부터 눌러보고, 막히면 그때 찾아본다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '인지 선호 2',
    q: '벼락치기를 해야 할 때, 머릿속에 가장 잘 들어오는 방식은?',
    opts: [
      { v: 'textual', t: '개념과 배경이 정리된 줄글을 쭉 읽어 내려간다' },
      { v: 'visual', t: '형광펜 칠한 핵심 단어나 요약 표·그림을 본다' },
      { v: 'pragmatic', t: '기출문제나 객관식 퀴즈를 풀면서 오답을 확인한다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '단어 외우기',
    q: '처음 보는 일본어 단어를 외워야 할 때, 제일 손이 가는 방법은?',
    opts: [
      { v: 'textual', t: '단어·읽는 법·뜻을 목록으로 쭉 훑으며 눈에 익힌다' },
      { v: 'visual', t: '카드 한 장에 단어 하나씩, 크게 보면서 넘긴다' },
      { v: 'pragmatic', t: '일단 문제부터 풀어보고 틀린 것만 다시 본다' },
    ],
  },
]

export const PACE = {
  micro: { name: '마이크로', emoji: '⚡', short: '10단어씩 짧게', desc: '한 Day를 10단어씩 끊어서 공부해요. 한 세트가 끝날 때마다 쉬어 갈 수 있어요.' },
  deep: { name: '딥다이브', emoji: '🌊', short: '한 Day를 한 번에', desc: '한 Day의 단어를 끊지 않고 한 번에 쭉 공부해요.' },
}

export const COGNITIVE = {
  visual: { name: '카드형', emoji: '🃏', short: '한 장씩 크게', desc: '단어를 카드에 크게 띄우고, 탭하면 읽는 법과 뜻이 보여요.' },
  textual: { name: '목록형', emoji: '📖', short: '한 화면에 쭉', desc: '단어·읽는 법·뜻을 목록으로 한눈에 보여줘요. 뜻을 가리고 스스로 확인할 수도 있어요.' },
  pragmatic: { name: '퀴즈형', emoji: '🎯', short: '바로 문제로', desc: '설명 없이 곧바로 4지선다 문제로 단어를 만나요. 틀린 단어는 끝에 한 번 더 나와요.' },
}

// 세트 크기 (마이크로형)
export const CHUNK = 10

// 답 목록 → 성향. 인지 선호는 3문항 다수결, 셋 다 다르면 JLPT 단어 문항(마지막)을 따름
export function computeStyle(answers) {
  const pace = answers[0]
  const cog = answers.slice(1)
  const count = {}
  cog.forEach(v => { count[v] = (count[v] || 0) + 1 })
  const top = Object.keys(count).find(v => count[v] >= 2) ?? cog[cog.length - 1]
  return { pace, cognitive: top }
}

export const styleName = (s) => `${PACE[s.pace].name} · ${COGNITIVE[s.cognitive].name}`

// 내 AI에게 물어보기 — 평소 쓰는 AI(ChatGPT·Claude·Gemini 등)는 나와의 대화를 기억하고 있어 더 정확하게 판단할 수 있음
export const AI_PROMPT = `너는 내 학습 코치야. 지금까지 나와 나눈 대화와 네가 기억하는 나에 대한 정보를 바탕으로, 내가 일본어(JLPT) 단어를 외울 때 가장 잘 맞는 공부 방식을 판단해 줘.

판단할 것은 두 가지야.

1) 학습 호흡 (pace)
- micro: 짬날 때 10~15분씩 짧게 자주 하는 게 맞는 사람
- deep: 한 번 앉으면 오래 몰입해서 하는 게 맞는 사람

2) 익히는 방식 (cognitive)
- visual: 단어 하나를 카드에 크게 띄워 한 장씩 넘기며 눈으로 기억하는 게 맞는 사람
- textual: 단어·읽는 법·뜻을 목록으로 쭉 읽으며 정리된 정보로 익히는 게 맞는 사람
- pragmatic: 설명보다 문제를 먼저 풀고, 틀린 걸 확인하며 익히는 게 맞는 사람

규칙
- 나에 대해 아는 게 부족하거나 확신이 없으면 짐작하지 말고, 판단에 필요한 질문을 한 번에 하나씩, 최대 5개까지 먼저 해 줘. 내 답을 들은 뒤에 결론을 내 줘.
- 결론은 반드시 마지막에 아래 형식 그대로 출력해. 값은 영어 소문자로 써.

STUDYME pace=<micro 또는 deep> cognitive=<visual, textual, pragmatic 중 하나>
REASON: <이 방식이 나에게 맞는 이유를 한국어 한두 문장으로>`

// AI 답에서 결과 줄 찾기 — 코드 블록·굵게 표시·대소문자·콜론 등은 무시
// 대화 전체를 붙여넣어도 되도록 마지막 STUDYME 줄을 기준으로
export function parseAiResult(text) {
  const t = text.replace(/[*`_]/g, '')
  const at = t.toUpperCase().lastIndexOf('STUDYME')
  if (at < 0) return null
  const body = t.slice(at)
  const pace = body.match(/pace\s*[=:]\s*(micro|deep)/i)?.[1].toLowerCase()
  const cognitive = body.match(/cognitive\s*[=:]\s*(visual|textual|pragmatic)/i)?.[1].toLowerCase()
  if (!pace || !cognitive) return null
  const reason = body.match(/REASON\s*[:：]\s*(.+)/i)?.[1].trim().slice(0, 300) || ''
  return { pace, cognitive, reason }
}
